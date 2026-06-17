"""YOLO 微调 / 物体识别路由。"""
from __future__ import annotations
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from .. import config
from ..core.trainer_yolo import YoloTrainer
from ..schemas import YoloTrainRequest, TaskResponse

router = APIRouter(prefix="/api/yolo", tags=["yolo"])


@router.get("/models")
def list_models():
    trainer = YoloTrainer.instance()
    weights = []
    if config.YOLO_MODELS_DIR.exists():
        weights = [str(p.relative_to(config.ROOT))
                   for p in config.YOLO_MODELS_DIR.rglob("*.pt")]
    return {
        "choices": config.YOLO_MODEL_CHOICES,
        "trained": weights,
        "current": config.load()["yolo"],
        "available": trainer.available,
    }


@router.post("/train", response_model=TaskResponse)
def train(req: YoloTrainRequest):
    config.update({"yolo": {"base_model": req.base_model, "epochs": req.epochs,
                            "imgsz": req.imgsz, "batch": req.batch}})
    tid, msg = YoloTrainer.instance().start(
        req.base_model, req.data_yaml, req.epochs, req.imgsz, req.batch)
    if tid is None:
        raise HTTPException(409, msg)
    return TaskResponse(task_id=tid, message=msg)


@router.post("/detect")
async def detect(file: UploadFile = File(...), weights: str = Form("")):
    suffix = Path(file.filename or "img.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile("wb", suffix=suffix, delete=False) as f:
        shutil.copyfileobj(file.file, f)
        tmp = f.name
    try:
        result = YoloTrainer.instance().detect(tmp, weights or None)
    finally:
        try:
            Path(tmp).unlink()
        except Exception:
            pass
    if "error" in result:
        raise HTTPException(400, result["error"])
    return result
