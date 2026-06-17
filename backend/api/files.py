"""训练文件 & 数据上传路由。"""
from __future__ import annotations
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File

from .. import config

router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED = {".csv", ".json", ".jsonl", ".tsv", ".ndjson", ".yaml", ".yml", ".zip"}


@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    name = Path(file.filename or "").name
    if not name:
        raise HTTPException(400, "文件名无效。")
    if Path(name).suffix.lower() not in ALLOWED:
        raise HTTPException(400, f"不支持的文件类型：{Path(name).suffix}")
    dest = config.DATA_DIR / name
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"ok": True, "filename": name, "size": dest.stat().st_size}


@router.get("")
def list_files():
    files = []
    for p in sorted(config.DATA_DIR.glob("*")):
        if p.is_file():
            files.append({"name": p.name, "size": p.stat().st_size})
    return {"files": files}


@router.delete("/{name}")
def delete_file(name: str):
    safe = Path(name).name  # 防目录穿越
    target = config.DATA_DIR / safe
    if not target.exists() or not target.is_file():
        raise HTTPException(404, f"文件不存在：{safe}")
    target.unlink()
    return {"ok": True}
