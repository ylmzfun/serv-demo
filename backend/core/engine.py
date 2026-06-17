"""模型引擎：单例加载 + 缓存推理。MLX 未安装时优雅降级，接口照常可用。"""
from __future__ import annotations
import threading
from pathlib import Path

from .. import config

# MLX 为 Apple Silicon 专属，且需先安装。导入失败不应让整个应用崩溃。
try:
    from mlx_lm import load as _mlx_load, generate as _mlx_generate
    MLX_OK = True
    MLX_ERR = ""
except Exception as e:  # pragma: no cover - 取决于环境
    MLX_OK = False
    MLX_ERR = str(e)
    _mlx_load = None
    _mlx_generate = None

try:
    from mlx_lm.sample_utils import make_sampler as _make_sampler
except Exception:
    _make_sampler = None


class Engine:
    _instance: "Engine | None" = None
    _lock = threading.Lock()

    def __init__(self):
        self._cache: dict = {}  # (model_id, adapter) -> (model, tokenizer)
        self.available = MLX_OK
        self.last_error = MLX_ERR

    @classmethod
    def instance(cls) -> "Engine":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    # ---- 模型加载（带缓存） ----
    def _key(self, model_id: str, adapter: str | None):
        return (model_id, adapter or None)

    def _load(self, model_id: str, adapter: str | None):
        if not self.available:
            raise RuntimeError("MLX 未安装")
        key = self._key(model_id, adapter)
        if key in self._cache:
            return self._cache[key]
        kwargs = {}
        if adapter:
            ap = Path(config.abspath(adapter))
            if ap.exists():
                kwargs["adapter_path"] = str(ap)
        model, tok = _mlx_load(model_id, **kwargs)
        self._cache[key] = (model, tok)
        return model, tok

    def unload(self):
        self._cache.clear()

    def loaded_keys(self):
        return list(self._cache.keys())

    # ---- 推理 ----
    def _build_prompt(self, tok, messages):
        if hasattr(tok, "apply_chat_template") and getattr(tok, "chat_template", None):
            try:
                return tok.apply_chat_template(
                    messages, add_generation_prompt=True, tokenize=False)
            except Exception:
                pass
        parts = [f"{m['role']}: {m['content']}" for m in messages]
        parts.append("assistant:")
        return "\n".join(parts)

    def _generate_text(self, model, tok, prompt, temperature, max_tokens):
        """兼容不同 mlx_lm 版本的 generate 签名。"""
        if _make_sampler is not None:
            try:
                sampler = _make_sampler(temp=float(temperature))
                return _mlx_generate(
                    model, tok, prompt=prompt, max_tokens=int(max_tokens),
                    sampler=sampler, verbose=False)
            except TypeError:
                pass
            except Exception:
                pass
        for attempt in (
            lambda: _mlx_generate(model, tok, prompt=prompt, max_tokens=int(max_tokens), verbose=False),
            lambda: _mlx_generate(model, tok, prompt, max_tokens=int(max_tokens)),
            lambda: _mlx_generate(model, tok, prompt=prompt, temp=float(temperature), max_tokens=int(max_tokens)),
        ):
            try:
                return attempt()
            except TypeError:
                continue
        raise RuntimeError("当前 mlx_lm 版本的 generate 接口不兼容，请更新 mlx-lm")

    def chat(self, messages, *, model_id=None, adapter=None,
             temperature=None, max_tokens=None) -> str:
        cfg = config.load()
        m = cfg["model"]
        model_id = model_id or m["base_id"]
        if adapter is None:
            adapter = m["adapter_path"] if m.get("use_adapter") else None
        temperature = m["temperature"] if temperature is None else temperature
        max_tokens = m["max_tokens"] if max_tokens is None else max_tokens

        if not self.available:
            return ("⚠️ MLX 推理环境未就绪，无法生成。请安装依赖（mlx / mlx-lm）。"
                    f"\n\n详细：{self.last_error or '未检测到 mlx_lm'}")
        try:
            model, tok = self._load(model_id, adapter)
            prompt = self._build_prompt(tok, messages)
            out = self._generate_text(model, tok, prompt, temperature, max_tokens)
            return (out or "").strip()
        except Exception as e:
            return f"⚠️ 生成失败：{e}"

    def generate(self, prompt: str, *, system: str | None = None, **kw) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        return self.chat(messages, **kw)
