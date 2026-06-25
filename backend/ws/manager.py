from fastapi import WebSocket
from typing import DefaultDict
from collections import defaultdict
import json


class ConnectionManager:
    """管理每个 session 的 WebSocket 连接列表"""

    def __init__(self):
        # session_id -> list of active WebSocket connections
        self.active: DefaultDict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, session_id: str, ws: WebSocket):
        await ws.accept()
        self.active[session_id].append(ws)

    def disconnect(self, session_id: str, ws: WebSocket):
        connections = self.active.get(session_id, [])
        if ws in connections:
            connections.remove(ws)

    async def broadcast(self, session_id: str, event: str, data: dict):
        """向指定 session 的所有连接广播一条事件"""
        payload = json.dumps({"event": event, "data": data}, ensure_ascii=False)
        dead = []
        for ws in list(self.active.get(session_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)


manager = ConnectionManager()
