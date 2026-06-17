"""对话提供方路由：优先 DeepSeek API，回退本地 MLX。

- Agent / Orchestrator / 普通对话统一走本模块的 chat / generate。
- 选择策略由 config 的 providers.active 决定：
    "auto"     —— 配好 DeepSeek（启用且有 key）则优先用，否则用 MLX（默认）
    "deepseek" —— 强制 DeepSeek；未就绪时优雅回退到 MLX
    "mlx"      —— 强制本地 MLX
- DeepSeek 的 key 可写在 config 里，也可用环境变量 DEEPSEEK_API_KEY。
- 微调对比（基础 vs LoRA）天然属于 MLX，仍直接走 Engine，不经本模块。
"""
from __future__ import annotations

import os

from .. import config
from . import deepseek
from .engine import Engine


def _deepseek_cfg() -> dict:
    return config.load().get("providers", {}).get("deepseek", {})


def _deepseek_key() -> str:
    return _deepseek_cfg().get("api_key") or os.environ.get("DEEPSEEK_API_KEY", "")


def deepseek_ready() -> bool:
    """启用且能拿到 key 才算就绪。"""
    ds = _deepseek_cfg()
    return bool(ds.get("enabled", False) and _deepseek_key())


def active_provider() -> str:
    """解析出本次实际使用的提供方：'deepseek' 或 'mlx'。"""
    active = config.load().get("providers", {}).get("active", "auto")
    if active == "mlx":
        return "mlx"
    if active == "deepseek":
        return "deepseek" if deepseek_ready() else "mlx"
    # auto：优先 DeepSeek
    return "deepseek" if deepseek_ready() else "mlx"


def status() -> dict:
    """供前端展示的提供方状态（不回传明文 key）。"""
    ds = _deepseek_cfg()
    return {
        "active": config.load().get("providers", {}).get("active", "auto"),
        "resolved": active_provider(),
        "mlx_available": Engine.instance().available,
        "deepseek": {
            "enabled": ds.get("enabled", False),
            "has_key": bool(_deepseek_key()),
            "base_url": ds.get("base_url") or deepseek.DEFAULT_BASE,
            "model": ds.get("model") or deepseek.DEFAULT_MODEL,
        },
    }


def chat(messages, *, temperature=None, max_tokens=None, provider=None, **engine_kw) -> str:
    """统一对话入口。provider 显式指定时覆盖配置；否则按 active_provider 解析。"""
    prov = provider or active_provider()
    if prov == "deepseek" and deepseek_ready():
        ds = _deepseek_cfg()
        m = config.load()["model"]
        return deepseek.chat(
            messages,
            api_key=_deepseek_key(),
            base_url=ds.get("base_url"),
            model=ds.get("model"),
            temperature=m["temperature"] if temperature is None else temperature,
            max_tokens=m["max_tokens"] if max_tokens is None else max_tokens,
        )
    # 回退 / 强制本地：交给 MLX 引擎（保留 adapter 等参数）
    return Engine.instance().chat(
        messages, temperature=temperature, max_tokens=max_tokens, **engine_kw)


def generate(prompt: str, *, system: str | None = None, **kw) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return chat(messages, **kw)
