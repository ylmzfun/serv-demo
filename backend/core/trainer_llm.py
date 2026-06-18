"""LLM 微调封装：以子进程运行 mlx_lm.lora，日志经 TaskHub 实时广播，可随时停止。"""
from __future__ import annotations
import os
import sys
import time
import signal
import threading
import subprocess
from datetime import datetime
from pathlib import Path

import yaml

from .. import config
from ..tasks import hub, Task

ROOT = config.ROOT
PRESETS = config.LLM_PRESETS


class LlmTrainer:
    """单例：同一时间仅允许一个 LLM 训练任务。"""
    _instance: "LlmTrainer | None" = None

    def __init__(self):
        self.proc: subprocess.Popen | None = None
        self.thread: threading.Thread | None = None
        self.task: Task | None = None
        self.log_file: Path | None = None

    @classmethod
    def instance(cls) -> "LlmTrainer":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def is_running(self) -> bool:
        return self.task is not None and self.task.state == "running"

    def _write(self, text: str):
        if self.task:
            hub.log(self.task.task_id, text)
        if self.log_file:
            try:
                with open(self.log_file, "a", encoding="utf-8") as f:
                    f.write(text + "\n")
            except Exception:
                pass

    def _build_config_yaml(self, preset_name: str, iters_override: int | None) -> Path:
        cfg = config.load()
        preset = dict(PRESETS.get(preset_name, PRESETS["standard"]))
        if iters_override:
            preset["iters"] = int(iters_override)

        data_dir = config.abspath(cfg["training"]["data_dir"])
        adapter_dir = config.abspath(cfg["model"]["adapter_path"])
        Path(adapter_dir).mkdir(parents=True, exist_ok=True)

        doc = {
            "model": cfg["model"]["base_id"],
            "train": True,
            "data": data_dir,
            "adapter_path": adapter_dir,
            "fine_tune_type": "lora",
            "num_layers": preset["num_layers"],
            "batch_size": preset["batch_size"],
            "iters": preset["iters"],
            "val_batches": 25,
            "learning_rate": float(preset["learning_rate"]),
            "steps_per_report": 10,
            "steps_per_eval": max(50, preset["iters"] // 6),
            "save_every": max(50, preset["iters"] // 6),
            "max_seq_length": preset["max_seq_length"],
            "grad_checkpoint": True,
            "lora_parameters": {
                "rank": cfg["lora"]["rank"],
                "scale": float(cfg["lora"]["scale"]),
                "dropout": float(cfg["lora"]["dropout"]),
            },
        }
        out = ROOT / "config" / "_active_train.yaml"
        out.write_text(yaml.safe_dump(doc, allow_unicode=True, sort_keys=False), encoding="utf-8")
        return out

    def start(self, preset_name: str = "standard", iters_override: int | None = None) -> tuple[str | None, str]:
        """返回 (task_id, message)。task_id 为 None 表示启动失败。"""
        if self.is_running():
            return None, "已有训练在进行中。"

        cfg = config.load()
        data_dir = Path(config.abspath(cfg["training"]["data_dir"]))
        train_file = data_dir / "train.jsonl"
        if not train_file.exists():
            return None, f"未找到训练数据 {train_file}，请先上传并准备数据。"

        self.task = hub.create("llm_train", preset=preset_name, model=cfg["model"]["base_id"])
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = ROOT / "logs" / f"llm_train_{ts}.log"

        yaml_path = self._build_config_yaml(preset_name, iters_override)
        cmd = [sys.executable, "-m", "mlx_lm.lora", "--config", str(yaml_path), "--train"]
        self._write(f"[{datetime.now():%H:%M:%S}] 启动训练：{' '.join(cmd)}")
        self._write(f"[配置] 预置={preset_name} 模型={cfg['model']['base_id']}")

        tid = self.task.task_id

        def _run():
            try:
                self.proc = subprocess.Popen(
                    cmd, cwd=str(ROOT), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, bufsize=1, env={**os.environ, "PYTHONUNBUFFERED": "1"})
                for line in self.proc.stdout:
                    self._write(line.rstrip("\n"))
                code = self.proc.wait()
                if self.task and self.task.state == "stopped":
                    self._write("[已停止]")
                    hub.stopped(tid)
                elif code == 0:
                    self._write(f"[{datetime.now():%H:%M:%S}] 训练完成 ✅ 适配器已保存到 {cfg['model']['adapter_path']}")
                    hub.done(tid, adapter_path=cfg["model"]["adapter_path"])
                else:
                    self._write(f"[退出码 {code}] 训练异常结束，请检查上方日志。")
                    hub.error(tid, f"训练退出码 {code}")
            except Exception as e:
                self._write(f"[异常] {e}")
                hub.error(tid, str(e))
            finally:
                self.proc = None

        self.thread = threading.Thread(target=_run, daemon=True)
        self.thread.start()
        return tid, "训练已启动。"

    def stop(self) -> str:
        if not self.is_running() or self.proc is None:
            return "当前没有运行中的训练。"
        if self.task:
            self.task.state = "stopped"
        try:
            if os.name == "posix":
                self.proc.send_signal(signal.SIGINT)
                time.sleep(1.5)
            if self.proc and self.proc.poll() is None:
                self.proc.terminate()
        except Exception as e:
            self._write(f"[停止异常] {e}")
        return "已请求停止训练。"
