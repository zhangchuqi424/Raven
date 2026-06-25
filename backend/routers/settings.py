from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.claude import get_config, update_config

router = APIRouter(prefix="/settings", tags=["settings"])


class LLMSettingsUpdate(BaseModel):
    provider:   Optional[str] = None
    api_key:    Optional[str] = None
    base_url:   Optional[str] = None
    model:      Optional[str] = None
    max_tokens: Optional[int] = None


@router.get("")
def read_settings():
    """返回当前 LLM 配置（api_key 脱敏）。"""
    return get_config()


@router.post("")
def write_settings(body: LLMSettingsUpdate):
    """
    热更新 LLM 配置，下一次调用立即生效，无需重启。
    不会写入 .env，重启后恢复环境变量中的初始值。
    """
    update_config(**{k: v for k, v in body.model_dump().items() if v is not None})
    return get_config()
