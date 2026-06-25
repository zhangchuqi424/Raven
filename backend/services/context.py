from sqlalchemy.orm import Session as DBSession
from models.database import Node
from typing import Optional


def get_ancestor_chain(db: DBSession, node_id: Optional[str]) -> list[Node]:
    """
    从 node_id 向上追溯到根节点，返回有序祖先列表（根节点在前）。
    node_id=None 时返回空列表（表示将创建根节点）。
    """
    chain = []
    current_id = node_id

    while current_id is not None:
        node = db.get(Node, current_id)
        if node is None:
            break
        chain.append(node)
        current_id = node.parent_id

    chain.reverse()   # 根节点排最前
    return chain


def build_context(db: DBSession, parent_id: Optional[str], new_question: str) -> list[dict]:
    """
    构建发送给 Claude API 的 messages 数组。

    - 把 parent_id 的所有祖先对话（含 parent_id 本身）拼成历史
    - 最后追加当前新问题
    - 跳过 answer 为空的节点（流式输出未完成）

    返回格式：
    [
      {"role": "user",      "content": "..."},
      {"role": "assistant", "content": "..."},
      ...
      {"role": "user",      "content": new_question},  # 当前问题
    ]
    """
    chain = get_ancestor_chain(db, parent_id)

    messages = []
    for node in chain:
        messages.append({"role": "user",      "content": node.question})
        if node.answer:   # answer 完成才放进去
            messages.append({"role": "assistant", "content": node.answer})

    # 追加当前新问题
    messages.append({"role": "user", "content": new_question})

    return messages


def trim_context(messages: list[dict], max_chars: int = 80_000) -> list[dict]:
    """
    当上下文过长时，从最早的消息对开始裁剪，
    保留最新问题和尽量多的近期历史。
    """
    total = sum(len(m["content"]) for m in messages)
    if total <= max_chars:
        return messages

    # 保留最后一条（当前问题）不动，从头部删 user/assistant 对
    trimmed = list(messages)
    while len(trimmed) > 1:
        total = sum(len(m["content"]) for m in trimmed)
        if total <= max_chars:
            break
        # 删最早的一对（user + assistant）或单条
        trimmed.pop(0)
        if trimmed and trimmed[0]["role"] == "assistant":
            trimmed.pop(0)

    return trimmed
