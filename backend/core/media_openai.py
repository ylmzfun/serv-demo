"""OpenAI 兼容图片接口：images/generations（文生图）与 images/edits（修图）。

仅依赖 requests。修图走 multipart（edits），文生图走 JSON（generations）。
base_url / model 由调用方传入，兼容自建网关。
"""
from __future__ import annotations

import base64

import requests

DEFAULT_BASE = "https://api.openai.com/v1"


def generate_image(prompt: str, *, api_key: str, base_url: str | None = None,
                   model: str = "gpt-image-1", image_bytes: bytes | None = None,
                   size: str = "1024x1024", timeout: int = 180) -> bytes:
    base = (base_url or DEFAULT_BASE).rstrip("/")
    if image_bytes:
        # 修图：multipart 到 /images/edits
        url = f"{base}/images/edits"
        files = {"image": ("input.png", image_bytes, "image/png")}
        data = {"model": model, "prompt": prompt, "size": size}
        resp = requests.post(url, headers={"Authorization": f"Bearer {api_key}"},
                             files=files, data=data, timeout=timeout)
    else:
        url = f"{base}/images/generations"
        payload = {"model": model, "prompt": prompt, "size": size}
        resp = requests.post(url, json=payload,
                             headers={"Authorization": f"Bearer {api_key}",
                                      "Content-Type": "application/json"}, timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"OpenAI 图片接口 HTTP {resp.status_code}：{_err(resp)}")
    data = resp.json().get("data") or []
    if not data:
        raise RuntimeError("OpenAI 图片接口未返回数据。")
    item = data[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    img_url = item.get("url")
    if not img_url:
        raise RuntimeError("OpenAI 图片接口未返回 url / b64。")
    r = requests.get(img_url, timeout=timeout)
    r.raise_for_status()
    return r.content


def _err(resp: requests.Response) -> str:
    try:
        return resp.json().get("error", {}).get("message", "") or resp.text[:200]
    except Exception:
        return (resp.text or "")[:200]
