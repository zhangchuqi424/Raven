from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from typing import Optional
import uuid
import json

from models.database import Node, get_db
from services.context import build_context, trim_context
from services.claude import stream_response
from ws.manager import manager

router = APIRouter(prefix="/nodes", tags=["nodes"])


class CreateNodeRequest(BaseModel):
    session_id: str
    parent_id: Optional[str] = None
    question: str


class CreateNoteRequest(BaseModel):
    session_id: str
    parent_id: Optional[str] = None
    content: str


@router.post("")
async def create_node(body: CreateNodeRequest, db: DBSession = Depends(get_db)):
    """
    创建新节点并流式返回 AI 回答。
    同时通过 WebSocket 向该 session 的所有连接广播事件。

    流式响应格式（SSE-like text/event-stream）：
      data: {"type": "delta", "content": "..."}\\n\\n
      data: {"type": "done", "node": {...}}\\n\\n
    """
    node_id = str(uuid.uuid4())
    summary = body.question[:25].strip()

    # 构建上下文
    messages = build_context(db, body.parent_id, body.question)
    messages = trim_context(messages)

    # 先把节点写入DB（answer 暂为 null，流式结束后更新）
    node = Node(
        id=node_id,
        session_id=body.session_id,
        parent_id=body.parent_id,
        question=body.question,
        summary=summary,
        answer=None,
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    async def event_stream():
        full_answer = []
        try:
            async for chunk in stream_response(messages):
                full_answer.append(chunk)
                # 推流给前端
                yield f"data: {json.dumps({'type': 'delta', 'content': chunk}, ensure_ascii=False)}\n\n"
                # 同时广播给所有 WebSocket 连接（不阻塞SSE）
                await manager.broadcast(
                    body.session_id,
                    "node_streaming",
                    {"id": node_id, "delta": chunk},
                )

            # 流式结束，写完整回答
            answer_text = "".join(full_answer)
            with DBSession(db.bind) as write_db:
                db_node = write_db.get(Node, node_id)
                if db_node:
                    db_node.answer = answer_text
                    write_db.commit()

            # 广播节点创建完成
            node_data = {
                "id":         node_id,
                "session_id": body.session_id,
                "parent_id":  body.parent_id,
                "question":   body.question,
                "answer":     answer_text,
                "summary":    summary,
                "node_type":  "ai",
            }
            await manager.broadcast(body.session_id, "node_created", node_data)

            yield f"data: {json.dumps({'type': 'done', 'node': node_data}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/note")
async def create_note(body: CreateNoteRequest, db: DBSession = Depends(get_db)):
    """
    创建用户自己的想法节点（不调用 LLM，直接存库并广播）。
    """
    node_id = str(uuid.uuid4())
    summary = body.content[:25].strip()

    node = Node(
        id=node_id,
        session_id=body.session_id,
        parent_id=body.parent_id,
        question=body.content,   # 复用 question 字段存笔记内容
        answer=None,
        summary=summary,
        node_type='note',
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    node_data = {
        "id":         node_id,
        "session_id": body.session_id,
        "parent_id":  body.parent_id,
        "question":   body.content,
        "answer":     None,
        "summary":    summary,
        "node_type":  "note",
    }
    await manager.broadcast(body.session_id, "node_created", node_data)

    return node_data


@router.get("/{node_id}/context")
def get_node_context(node_id: str, db: DBSession = Depends(get_db)):
    """调试用：返回该节点的完整祖先上下文链"""
    from services.context import get_ancestor_chain
    chain = get_ancestor_chain(db, node_id)
    return [
        {
            "id": n.id,
            "question": n.question,
            "answer": n.answer,
            "summary": n.summary,
        }
        for n in chain
    ]
