"""
LLM 调用服务。
支持 anthropic SDK 和任意 OpenAI-compatible 接口（DeepSeek / Groq / Ollama 等）。
运行时可通过 POST /settings 热更新配置，无需重启。
"""
import os
from typing import AsyncGenerator

# ─── 当前生效配置（可在运行时通过 /settings 接口修改）────────────────────
_config: dict = {
    "provider":   os.getenv("LLM_PROVIDER",  "anthropic").lower(),
    "api_key":    os.getenv("LLM_API_KEY") or os.getenv("ANTHROPIC_API_KEY", ""),
    "base_url":   os.getenv("LLM_BASE_URL")  or None,
    "model":      os.getenv("LLM_MODEL",     "claude-opus-4-8"),
    "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "2048")),
}

SYSTEM_PROMPT = """你是一个帮助用户深度学习的AI助手。
用户会沿着一条知识链不断追问，你需要：
1. 结合对话历史理解当前问题的上下文
2. 给出清晰、准确的解释
3. 在回答中自然地引出相关概念，但不要主动展开
回答语言与用户保持一致。"""


# ─── 配置读写（供 /settings 路由调用）────────────────────────────────────

def get_config() -> dict:
    """返回当前配置副本（api_key 脱敏）。"""
    cfg = dict(_config)
    key = cfg.get("api_key", "")
    if len(key) > 12:
        cfg["api_key"] = key[:8] + "..." + key[-4:]
    elif key:
        cfg["api_key"] = "****"
    return cfg


def update_config(**kwargs) -> None:
    """
    运行时热更新配置，下一次请求立即生效。
    不写入 .env，重启后恢复环境变量中的值。
    """
    allowed = {"provider", "api_key", "base_url", "model", "max_tokens"}
    for k, v in kwargs.items():
        if k not in allowed:
            continue
        if k == "provider" and v:
            v = v.lower()
        if k == "max_tokens" and v is not None:
            v = int(v)
        # 空字符串视为 None（base_url 等可选项）
        _config[k] = v if v != "" else None


# ─── 客户端工厂（每次请求按当前配置快照创建，开销极低）─────────────────────

def _make_anthropic(api_key: str, base_url: str | None):
    import anthropic
    kwargs: dict = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    return anthropic.Anthropic(**kwargs)


def _make_openai(api_key: str, base_url: str | None):
    from openai import AsyncOpenAI
    kwargs: dict = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    return AsyncOpenAI(**kwargs)


# ─── 对外接口 ─────────────────────────────────────────────────────────────

async def stream_response(messages: list[dict]) -> AsyncGenerator[str, None]:
    """
    流式调用 LLM，逐块 yield 文本内容。
    自动根据 _config["provider"] 选择 SDK。
    """
    cfg = dict(_config)   # 请求期间快照，避免并发时配置被修改

    if cfg["provider"] == "anthropic":
        client = _make_anthropic(cfg["api_key"], cfg["base_url"])
        with client.messages.stream(
            model=cfg["model"],
            max_tokens=cfg["max_tokens"],
            system=SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

    else:
        # OpenAI-compatible（openai / DeepSeek / Groq / Ollama …）
        client = _make_openai(cfg["api_key"], cfg["base_url"])
        full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
        stream = await client.chat.completions.create(
            model=cfg["model"],
            max_tokens=cfg["max_tokens"],
            messages=full_messages,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
