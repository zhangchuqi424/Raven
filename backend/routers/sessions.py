from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from typing import Optional
import uuid

from models.database import Session, Node, get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])


class CreateSessionRequest(BaseModel):
    name: Optional[str] = "新会话"


@router.get("")
def list_sessions(db: DBSession = Depends(get_db)):
    """获取所有会话，按创建时间倒序"""
    sessions = db.query(Session).order_by(Session.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.post("")
def create_session(body: CreateSessionRequest, db: DBSession = Depends(get_db)):
    """新建会话"""
    session = Session(id=str(uuid.uuid4()), name=body.name or "新会话")
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "id": session.id,
        "name": session.name,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


@router.delete("/{session_id}")
def delete_session(session_id: str, db: DBSession = Depends(get_db)):
    """删除会话及其所有节点"""
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"ok": True}


@router.get("/{session_id}/tree")
def get_tree(session_id: str, db: DBSession = Depends(get_db)):
    """
    返回完整树结构，用于前端渲染。
    格式：{ session, nodes: [{id, parent_id, summary, question, answer, created_at}] }
    """
    session = db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    nodes = (
        db.query(Node)
        .filter(Node.session_id == session_id)
        .order_by(Node.created_at)
        .all()
    )

    return {
        "session": {
            "id": session.id,
            "name": session.name,
            "created_at": session.created_at.isoformat() if session.created_at else None,
        },
        "nodes": [
            {
                "id":        n.id,
                "parent_id": n.parent_id,
                "summary":   n.summary or n.question[:20],
                "question":  n.question,
                "answer":    n.answer,
                "node_type": n.node_type or "ai",
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in nodes
        ],
    }
