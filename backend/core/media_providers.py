"""媒体提供方路由：图片(修图) / 视频(电影) 各自在「开源本地 / 厂商 API」间选择。

- active=auto：优先「enabled 且有 key」的厂商，否则回退 local。
- run_image / run_video 在后台线程执行，经 TaskHub 推送实时进度并固化到 SQLite，
  产物写入 MEDIA_DIR，done 时回传可静态访问的 /media/... URL。
"""
from __future__ import annotations

import base64
import os
import time
import uuid

from .. import config
from ..tasks import hub
from . import media_ark, media_openai, media_local

# 厂商 key 也可来自环境变量。
_ENV = {"ark": "ARK_API_KEY", "openai": "OPENAI_API_KEY"}


def _cap(cap: str) -> dict:
    return config.load().get("media", {}).get(cap, {})


def _key(cap: str, vendor: str) -> str:
    return _cap(cap).get(vendor, {}).get("api_key") or os.environ.get(_ENV.get(vendor, ""), "")


def _vendor_ready(cap: str, vendor: str) -> bool:
    v = _cap(cap).get(vendor, {})
    return bool(v.get("enabled") and _key(cap, vendor))


def _resolve(cap: str, vendors: list[str]) -> str:
    active = _cap(cap).get("active", "auto")
    if active in vendors and _vendor_ready(cap, active):
        return active
    if active == "local":
        return "local"
    if active != "auto" and active != "local":
        # 指定厂商但未就绪 → 尝试回退
        pass
    for v in vendors:
        if _vendor_ready(cap, v):
            return v
    return "local"


def image_provider() -> str:
    return _resolve("image", ["ark", "openai"])


def video_provider() -> str:
    return _resolve("video", ["ark"])


def status() -> dict:
    img, vid = _cap("image"), _cap("video")
    def vinfo(cap, vendor):
        v = _cap(cap).get(vendor, {})
        return {"enabled": v.get("enabled", False), "has_key": bool(_key(cap, vendor)),
                "base_url": v.get("base_url", ""), "model": v.get("model", "")}
    return {
        "image": {
            "active": img.get("active", "auto"), "resolved": image_provider(),
            "ark": vinfo("image", "ark"), "openai": vinfo("image", "openai"),
            "local": {"enabled": img.get("local", {}).get("enabled", False),
                      "available": media_local.image_available(),
                      "model": img.get("local", {}).get("model", "")},
        },
        "video": {
            "active": vid.get("active", "auto"), "resolved": video_provider(),
            "ark": vinfo("video", "ark"),
            "local": {"enabled": vid.get("local", {}).get("enabled", False),
                      "available": False, "model": vid.get("local", {}).get("model", "")},
        },
    }


# ----------------------------- 图片 -----------------------------
def run_image(task_id: str, prompt: str, image_bytes: bytes | None, size: str = "1024x1024"):
    try:
        prov = image_provider()
        hub.log(task_id, f"[修图] 使用提供方：{prov} · 尺寸 {size}")
        cap = _cap("image")
        if prov == "ark":
            v = cap["ark"]
            data = media_ark.generate_image(
                prompt, api_key=_key("image", "ark"), base_url=v.get("base_url"),
                model=v.get("model"), size=size,
                image_b64=base64.b64encode(image_bytes).decode() if image_bytes else None)
        elif prov == "openai":
            v = cap["openai"]
            data = media_openai.generate_image(
                prompt, api_key=_key("image", "openai"), base_url=v.get("base_url"),
                model=v.get("model"), size=size, image_bytes=image_bytes)
        else:  # local
            v = cap.get("local", {})
            data = media_local.LocalImage.instance().generate(
                prompt, model=v.get("model", "stabilityai/stable-diffusion-2-1"),
                image_bytes=image_bytes)
        name = f"img_{uuid.uuid4().hex[:10]}.png"
        (config.MEDIA_IMG_DIR / name).write_bytes(data)
        url = f"/media/images/{name}"
        hub.log(task_id, f"[完成] 已生成 {url}")
        hub.done(task_id, url=url, kind="image", provider=prov)
    except Exception as e:
        hub.error(task_id, str(e))


# ----------------------------- 视频 -----------------------------
def run_video(task_id: str, prompt: str, image_bytes: bytes | None,
              duration: int = 5, ratio: str = "16:9"):
    try:
        prov = video_provider()
        hub.log(task_id, f"[电影] 使用提供方：{prov} · {duration}s · {ratio}")
        if prov != "ark":
            hub.error(task_id, "本地视频生成暂未内置，请在「提供方」配置 Seedance(Ark) 的 API Key。")
            return
        v = _cap("video")["ark"]
        api_key = _key("video", "ark")
        image_url = None
        if image_bytes:
            image_url = "data:image/png;base64," + base64.b64encode(image_bytes).decode()
        tid = media_ark.submit_video(
            prompt, api_key=api_key, base_url=v.get("base_url"), model=v.get("model"),
            image_url=image_url, duration=duration, ratio=ratio)
        hub.log(task_id, f"[已提交] Ark 任务 {tid}，开始轮询…")
        deadline = time.time() + 600  # 最多等 10 分钟
        n = 0
        while time.time() < deadline:
            time.sleep(6)
            n += 1
            info = media_ark.get_video_task(tid, api_key=api_key, base_url=v.get("base_url"))
            st = info["status"]
            hub.progress(task_id, status=st, polls=n)
            hub.log(task_id, f"[轮询 {n}] 状态：{st}")
            if st in ("succeeded", "success"):
                vurl = info["video_url"]
                if not vurl:
                    hub.error(task_id, "任务成功但未返回 video_url。")
                    return
                data = media_ark.download(vurl)
                name = f"video_{uuid.uuid4().hex[:10]}.mp4"
                (config.MEDIA_VIDEO_DIR / name).write_bytes(data)
                url = f"/media/videos/{name}"
                hub.log(task_id, f"[完成] 已生成 {url}")
                hub.done(task_id, url=url, kind="video", provider=prov)
                return
            if st in ("failed", "error", "canceled", "cancelled"):
                hub.error(task_id, f"Ark 任务失败：{info.get('error') or st}")
                return
        hub.error(task_id, "视频生成超时（>10 分钟）。")
    except Exception as e:
        hub.error(task_id, str(e))
