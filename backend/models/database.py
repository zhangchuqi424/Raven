from sqlalchemy import create_engine, Column, String, Text, DateTime, ForeignKey, func, text
from sqlalchemy.orm import DeclarativeBase, relationship, Session as DBSession
from sqlalchemy.pool import StaticPool
import os
import uuid

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./breadcrumb.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String, nullable=False, default="新会话")
    created_at = Column(DateTime, server_default=func.now())

    nodes = relationship("Node", back_populates="session", cascade="all, delete-orphan")


class Node(Base):
    __tablename__ = "nodes"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    parent_id  = Column(String, ForeignKey("nodes.id"), nullable=True)   # 根节点为 null
    question   = Column(Text, nullable=False)
    answer     = Column(Text, nullable=True)     # 流式输出完成前为 null；note 节点不使用
    summary    = Column(String, nullable=True)   # 节点标题，截取自 question/content
    node_type  = Column(String, nullable=False, default='ai', server_default='ai')  # 'ai' | 'note'
    created_at = Column(DateTime, server_default=func.now())

    session  = relationship("Session", back_populates="nodes")
    parent   = relationship("Node", remote_side="Node.id", back_populates="children")
    children = relationship("Node", back_populates="parent")


def init_db():
    """建表，应用启动时调用。同时做存量数据库的列迁移。"""
    Base.metadata.create_all(bind=engine)
    # 迁移：给存量数据库补 node_type 列（已有列时 SQLite 会报错，直接忽略）
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE nodes ADD COLUMN node_type VARCHAR NOT NULL DEFAULT 'ai'"))
            conn.commit()
        except Exception:
            pass  # 列已存在，跳过


def get_db():
    """FastAPI 依赖注入用：获取数据库 session"""
    with DBSession(engine) as db:
        yield db
