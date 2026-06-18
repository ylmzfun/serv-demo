"""火山方舟 Ark 媒体客户端：Seedream（图片）/ Seedance（视频）。

仅依赖 requests。失败抛 RuntimeError（带可读信息），由上层 run_* 捕获记日志。
- 图片：POST {base}/images/generations，返回图片字节（url 下载或 b64 解码）。
- 视频：异步任务——创建任务拿 id，再轮询直到 succeeded，取 video_url。
模型 ID / base_url 全部由调用方（来自 config）传入，便于随官方更新调整。
"""
from __future__ import annotations

import base64
import time

import requests

DEFAULT_BASE = "https://ark.cn-beijing.volces.com/api/v3"


def _headers(api_key: str) -> dict:
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def generate_image(prompt: str, *, api_key: str, base_url: str | None = None,
                   model: str, image_b64: str | None = None,
                   size: str = "1024x1024", timeout: int = 180) -> bytes:
    """文生图 / 图生图（带 image_b64 时为修图）。返回图片字节。"""
    url = f"{(base_url or DEFAULT_BASE).rstrip('/')}/images/generations"
    payload: dict = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "response_format": "url",
        "watermark": False,
    }
    if image_b64:
        # Seedream 图生图：传参考图（data URI）。
        payload["image"] = f"data:image/png;base64,{image_b64}"
    resp = requests.post(url, json=payload, headers=_headers(api_key), timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"Ark 图片接口 HTTP {resp.status_code}：{_err(resp)}")
    data = resp.json().get("data") or []
    if not data:
        raise RuntimeError("Ark 图片接口未返回数据。")
    item = data[0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    img_url = item.get("url")
    if not img_url:
        raise RuntimeError("Ark 图片接口未返回 url / b64。")
    r = requests.get(img_url, timeout=timeout)
    r.raise_for_status()
    return r.content


def submit_video(prompt: str, *, api_key: str, base_url: str | None = None,
                 model: str, image_url: str | None = None,
                 duration: int = 5, ratio: str = "16:9", timeout: int = 60) -> str:
    """创建视频生成任务，返回 task id。"""
    url = f"{(base_url or DEFAULT_BASE).rstrip('/')}/contents/generations/tasks"
    text = f"{prompt} --rt {ratio} --dur {duration}"
    content: list[dict] = [{"type": "text", "text": text}]
    if image_url:
        content.append({"type": "image_url", "image_url": {"url": image_url}})
    payload = {"model": model, "content": content}
    resp = requests.post(url, json=payload, headers=_headers(api_key), timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"Ark 视频创建 HTTP {resp.status_code}：{_err(resp)}")
    tid = resp.json().get("id")
    if not tid:
        raise RuntimeError("Ark 视频接口未返回任务 id。")
    return tid


def get_video_task(task_id: str, *, api_key: str, base_url: str | None = None,
                   timeout: int = 60) -> dict:
    """查询任务状态，返回 {status, video_url, error}。"""
    url = f"{(base_url or DEFAULT_BASE).rstrip('/')}/contents/generations/tasks/{task_id}"
    resp = requests.get(url, headers=_headers(api_key), timeout=timeout)
    if not resp.ok:
        raise RuntimeError(f"Ark 视频查询 HTTP {resp.status_code}：{_err(resp)}")
    j = resp.json()
    return {
        "status": j.get("status", ""),
        "video_url": (j.get("content") or {}).get("video_url", ""),
        "error": j.get("error"),
    }


def download(url: str, timeout: int = 300) -> bytes:
    r = requests.get(url, timeout=timeout)
    r.raise_for_status()
    return r.content


def _err(resp: requests.Response) -> str:
    try:
        return resp.json().get("error", {}).get("message", "") or resp.text[:200]
    except Exception:
        return (resp.text or "")[:200]
