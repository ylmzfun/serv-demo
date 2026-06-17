"""DeepSeek API 客户端（OpenAI 兼容的 /chat/completions）。

仅依赖 requests，无需额外 SDK。失败时返回以 ⚠️ 开头的可读错误，
与 Engine 的降级风格保持一致，便于前端直接展示。
"""
from __future__ import annotations

import requests

DEFAULT_BASE = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"


def chat(
    messages: list[dict],
    *,
    api_key: str,
    base_url: str | None = None,
    model: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    timeout: int = 120,
) -> str:
    if not api_key:
        return "⚠️ 未配置 DeepSeek API Key，无法调用。请在「模型 & 微调」页填写或设置环境变量 DEEPSEEK_API_KEY。"

    url = f"{(base_url or DEFAULT_BASE).rstrip('/')}/chat/completions"
    payload = {
        "model": model or DEFAULT_MODEL,
        "messages": messages,
        "temperature": float(temperature),
        "max_tokens": int(max_tokens),
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        return (data["choices"][0]["message"]["content"] or "").strip()
    except requests.HTTPError as e:  # 鉴权/额度/模型名等
        detail = ""
        try:
            detail = e.response.json().get("error", {}).get("message", "")
        except Exception:
            detail = (e.response.text or "")[:200] if e.response is not None else ""
        return f"⚠️ DeepSeek 调用失败（HTTP {getattr(e.response, 'status_code', '?')}）：{detail or e}"
    except Exception as e:
        return f"⚠️ DeepSeek 调用失败：{e}"
