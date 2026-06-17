"""YOLO 训练与推理封装：基于 ultralytics。未安装时优雅降级。

训练在后台线程运行，进度通过 ultralytics 回调经 TaskHub 广播。
"""
from __future__ import annotations
import threading
from datetime import datetime
from pathlib import Path

from .. import config
from ..tasks import hub, Task

try:
    from ultralytics import YOLO
    YOLO_OK = True
    YOLO_ERR = ""
except Exception as e:  # pragma: no cover - 取决于环境
    YOLO_OK = False
    YOLO_ERR = str(e)
    YOLO = None

ROOT = config.ROOT


class YoloTrainer:
    _instance: "YoloTrainer | None" = None

    def __init__(self):
        self.thread: threading.Thread | None = None
        self.task: Task | None = None
        self.available = YOLO_OK
        self.last_error = YOLO_ERR

    @classmethod
    def instance(cls) -> "YoloTrainer":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_running(self) -> bool:
        return self.task is not None and self.task.state == "running"

    def start(self, base_model: str, data_yaml: str, epochs: int = 50,
              imgsz: int = 640, batch: int = 16) -> tuple[str | None, str]:
        if not self.available:
            return None, f"ultralytics 未安装，无法训练 YOLO。详细：{self.last_error}"
        if self.is_running():
            return None, "已有 YOLO 训练在进行中。"

        data_path = Path(config.abspath(data_yaml))
        if not data_path.exists():
            return None, f"未找到数据集配置 {data_path}（需 Ultralytics 的 data.yaml）。"

        self.task = hub.create("yolo_train", base_model=base_model, epochs=epochs)
        tid = self.task.task_id
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        project = config.YOLO_MODELS_DIR / f"train_{ts}"
        hub.log(tid, f"[{datetime.now():%H:%M:%S}] 启动 YOLO 训练：{base_model} · epochs={epochs} · imgsz={imgsz}")

        def _run():
            try:
                model = YOLO(base_model)

                def _on_epoch_end(trainer):
                    ep = getattr(trainer, "epoch", 0) + 1
                    total = getattr(trainer, "epochs", epochs)
                    hub.progress(tid, epoch=ep, total=total)
                    hub.log(tid, f"[epoch {ep}/{total}] 训练中…")

                try:
                    model.add_callback("on_fit_epoch_end", _on_epoch_end)
                except Exception:
                    pass

                results = model.train(
                    data=str(data_path), epochs=int(epochs), imgsz=int(imgsz),
                    batch=int(batch), project=str(project.parent), name=project.name,
                    exist_ok=True, verbose=True)
                best = getattr(getattr(results, "save_dir", None), "__str__", lambda: str(project))()
                hub.log(tid, f"训练完成 ✅ 权重输出到 {best}")
                hub.done(tid, save_dir=str(best))
            except Exception as e:
                hub.log(tid, f"[异常] {e}")
                hub.error(tid, str(e))

        self.thread = threading.Thread(target=_run, daemon=True)
        self.thread.start()
        return tid, "YOLO 训练已启动。"

    def detect(self, image_path: str, weights: str | None = None) -> dict:
        """对单张图片做检测，返回检测框列表。"""
        if not self.available:
            return {"error": f"ultralytics 未安装。{self.last_error}"}
        ip = Path(config.abspath(image_path))
        if not ip.exists():
            return {"error": f"图片不存在：{ip}"}
        cfg = config.load()
        weights = weights or cfg["yolo"]["base_model"]
        try:
            model = YOLO(config.abspath(weights) if Path(config.abspath(weights)).exists() else weights)
            results = model(str(ip))
            boxes = []
            for r in results:
                names = getattr(r, "names", {})
                for b in getattr(r, "boxes", []):
                    cls_id = int(b.cls[0]) if hasattr(b, "cls") else -1
                    boxes.append({
                        "label": names.get(cls_id, str(cls_id)),
                        "confidence": round(float(b.conf[0]), 4) if hasattr(b, "conf") else None,
                        "xyxy": [round(float(x), 2) for x in b.xyxy[0].tolist()] if hasattr(b, "xyxy") else [],
                    })
            return {"detections": boxes, "count": len(boxes)}
        except Exception as e:
            return {"error": str(e)}
