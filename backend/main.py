from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from models.database import init_db
from routers import sessions, nodes, settings
from ws.manager import manager
import os

load_dotenv()

app = FastAPI(title="Raven API")


@app.on_event("startup")
async def startup():
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由注册
app.include_router(sessions.router)
app.include_router(nodes.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    每个 session 的 WebSocket 频道。
    客户端连接后监听：
      - node_streaming: AI 回答流式增量
      - node_created:   节点创建完成（树更新）
    """
    await manager.connect(session_id, websocket)
    try:
        while True:
            await websocket.receive_text()   # 保持连接存活
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
