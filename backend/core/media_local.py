"""本地开源生成（可选）：基于 diffusers 在 Apple Silicon(MPS) 上做图片生成/修图。

diffusers/torch 为可选依赖：未安装时 available=False，调用返回明确提示而非崩溃
（参照 engine.py / trainer_yolo.py 的优雅降级）。视频本地生成本期不内置，返回未就绪。
"""
from __future__ import annotations

import io
import threading

try:
    import torch
    from diffusers import (
        StableDiffusionPipeline,
        StableDiffusionImg2ImgPipeline,
    )
    _DIFFUSERS_OK = True
    _DIFFUSERS_ERR = ""
except Exception as e:  # pragma: no cover - 取决于环境
    _DIFFUSERS_OK = False
    _DIFFUSERS_ERR = str(e)
    torch = None


def _device() -> str:
    if torch is None:
        return "cpu"
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


class LocalImage:
    """单例：缓存 diffusers 管线，避免重复加载。"""
    _instance: "LocalImage | None" = None
    _lock = threading.Lock()

    def __init__(self):
        self.available = _DIFFUSERS_OK
        self.last_error = _DIFFUSERS_ERR
        self._t2i = {}
        self._i2i = {}

    @classmethod
    def instance(cls) -> "LocalImage":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def generate(self, prompt: str, *, model: str, image_bytes: bytes | None = None,
                 steps: int = 30) -> bytes:
        if not self.available:
            raise RuntimeError(f"本地 diffusers 未安装：{self.last_error}。可 `uv pip install diffusers` 或改用厂商 API。")
        from PIL import Image
        device = _device()
        if image_bytes:
            pipe = self._i2i.get(model)
            if pipe is None:
                pipe = StableDiffusionImg2ImgPipeline.from_pretrained(model)
                pipe = pipe.to(device)
                self._i2i[model] = pipe
            init = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            out = pipe(prompt=prompt, image=init, strength=0.75,
                       num_inference_steps=steps).images[0]
        else:
            pipe = self._t2i.get(model)
            if pipe is None:
                pipe = StableDiffusionPipeline.from_pretrained(model)
                pipe = pipe.to(device)
                self._t2i[model] = pipe
            out = pipe(prompt=prompt, num_inference_steps=steps).images[0]
        buf = io.BytesIO()
        out.save(buf, format="PNG")
        return buf.getvalue()


def image_available() -> bool:
    return _DIFFUSERS_OK


def image_error() -> str:
    return _DIFFUSERS_ERR
