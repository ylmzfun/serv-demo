"""媒体创作路由：AI 修图（图片）/ AI 电影（单段视频）。

生成走后台线程 + TaskHub 实时进度（已固化到 SQLite）；产物存 MEDIA_DIR，
通过 /media 静态访问。提供方（开源本地 / 厂商 API）可在 /providers 端点配置。
"""
from __future__ import annotations

import threading
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form

from .. import config
from ..core import media_providers
from ..tasks import hub
from ..schemas import MediaProviderConfig, TaskResponse

router = APIRouter(prefix="/api/media", tags=["media"])


@router.get("/providers")
def get_providers():
    """两种能力的提供方状态（不回明文 key）。"""
    return media_providers.status()


@router.put("/providers")
def set_providers(body: MediaProviderConfig):
    """更新某能力的 active，或某厂商的 enabled/api_key/base_url/model。"""
    cap = body.cap
    patch: dict = {"media": {cap: {}}}
    node = patch["media"][cap]
    if body.active is not None:
        node["active"] = body.active
    if body.vendor is not None:
        vnode: dict = {}
        if body.enabled is not None:
            vnode["enabled"] = body.enabled
        if body.api_key is not None:
            vnode["api_key"] = body.api_key.strip()
        if body.base_url is not None:
            vnode["base_url"] = body.base_url.strip()
        if body.model is not None:
            vnode["model"] = body.model.strip()
        if vnode:
            node[body.vendor] = vnode
    config.update(patch)
    return {"ok": True, **media_providers.status()}


@router.post("/image", response_model=TaskResponse)
async def gen_image(prompt: str = Form(...), size: str = Form("1024x1024"),
                    file: UploadFile | None = File(None)):
    image_bytes = await file.read() if file is not None else None
    task = hub.create("image_edit", prompt=prompt[:80], has_image=bool(image_bytes))
    threading.Thread(
        target=media_providers.run_image,
        args=(task.task_id, prompt, image_bytes, size), daemon=True).start()
    return TaskResponse(task_id=task.task_id, message="已提交生成任务。")


@router.post("/video", response_model=TaskResponse)
async def gen_video(prompt: str = Form(...), duration: int = Form(5),
                    ratio: str = Form("16:9"), file: UploadFile | None = File(None)):
    image_bytes = await file.read() if file is not None else None
    task = hub.create("video_gen", prompt=prompt[:80], has_image=bool(image_bytes))
    threading.Thread(
        target=media_providers.run_video,
        args=(task.task_id, prompt, image_bytes, duration, ratio), daemon=True).start()
    return TaskResponse(task_id=task.task_id, message="已提交视频任务。")


@router.get("/outputs")
def outputs(kind: str = "image"):
    """列出已生成的产物（按 mtime 倒序）。kind: image | video。"""
    d = config.MEDIA_IMG_DIR if kind == "image" else config.MEDIA_VIDEO_DIR
    sub = "images" if kind == "image" else "videos"
    items = []
    for p in sorted(d.glob("*"), key=lambda x: x.stat().st_mtime, reverse=True):
        if p.is_file():
            items.append({"name": p.name, "url": f"/media/{sub}/{p.name}",
                          "size": p.stat().st_size, "mtime": p.stat().st_mtime})
    return {"outputs": items}
