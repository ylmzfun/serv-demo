"""统一配置：路径、端口、默认超参（唯一配置来源）。

运行时可变配置（Agent 角色、Skill 开关、MCP 服务器、模型选择）固化在
SQLite（backend/app.db 的 config_kv 表），由 Web 页面维护；本模块负责读写与深合并。
旧的 `config/runtime_config.json` 若存在，会在首次加载时自动迁移进 DB。
"""
from __future__ import annotations
import copy
import json
import threading
from pathlib import Path

from . import db

# backend/config.py -> backend 目录（data / models / logs / config 均位于其下）
ROOT = Path(__file__).resolve().parent
# 旧版 JSON 配置位置，仅用于一次性迁移。
CONFIG_PATH = ROOT / "config" / "runtime_config.json"

# ----------------------------- 路径 -----------------------------
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "models"
LLM_MODELS_DIR = MODELS_DIR / "llm"
YOLO_MODELS_DIR = MODELS_DIR / "yolo"
LOGS_DIR = ROOT / "logs"
MEDIA_DIR = ROOT / "media"            # 生成的图片/视频产物（静态服务于 /media）
MEDIA_IMG_DIR = MEDIA_DIR / "images"
MEDIA_VIDEO_DIR = MEDIA_DIR / "videos"

for _d in (DATA_DIR, LLM_MODELS_DIR, YOLO_MODELS_DIR, LOGS_DIR,
           MEDIA_IMG_DIR, MEDIA_VIDEO_DIR, CONFIG_PATH.parent):
    _d.mkdir(parents=True, exist_ok=True)

# ----------------------------- 服务 -----------------------------
HOST = "127.0.0.1"
PORT = 8000

# ----------------------------- 预置选项 -----------------------------
# LLM 基础模型（4bit 量化，适配 Apple Silicon 统一内存）
LLM_MODEL_CHOICES = [
    "mlx-community/Qwen2.5-7B-Instruct-4bit",
    "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
    "mlx-community/Qwen2.5-14B-Instruct-4bit",
    "mlx-community/Llama-3.2-3B-Instruct-4bit",
    "mlx-community/Llama-3.1-8B-Instruct-4bit",
    "mlx-community/gemma-2-9b-it-4bit",
    "mlx-community/Mistral-7B-Instruct-v0.3-4bit",
]

# YOLO 预置模型版本
YOLO_MODEL_CHOICES = [
    "yolo11n.pt", "yolo11s.pt", "yolo11m.pt",
    "yolov8n.pt", "yolov8s.pt", "yolov8m.pt",
]

# LLM 微调预置：轻量 / 标准 / 高质量
LLM_PRESETS = {
    "lite":     {"label": "轻量（快，省内存）",   "iters": 300,  "batch_size": 1, "num_layers": 8,  "learning_rate": 1e-4, "max_seq_length": 1024},
    "standard": {"label": "标准（推荐）",         "iters": 600,  "batch_size": 2, "num_layers": 16, "learning_rate": 1e-4, "max_seq_length": 2048},
    "hq":       {"label": "高质量（慢，效果好）", "iters": 1200, "batch_size": 2, "num_layers": 32, "learning_rate": 5e-5, "max_seq_length": 2048},
}

# ----------------------------- 默认运行时配置 -----------------------------
DEFAULT = {
    "model": {
        "base_id": "mlx-community/Qwen2.5-7B-Instruct-4bit",
        "adapter_path": "models/llm/adapters",
        "use_adapter": False,
        "temperature": 0.7,
        "max_tokens": 512,
    },
    "lora": {"rank": 8, "scale": 20.0, "layers": 16, "dropout": 0.0},
    # 对话提供方：active 决定 Agent / 对话用谁。优先 DeepSeek API，回退本地 MLX。
    "providers": {
        "active": "auto",  # auto（优先 deepseek）| deepseek | mlx
        "deepseek": {
            "enabled": True,
            "api_key": "",  # 留空则读环境变量 DEEPSEEK_API_KEY
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
        },
    },
    "training": {"config": "standard", "data_dir": "data/processed", "iters": 600},
    "yolo": {"base_model": "yolo11n.pt", "epochs": 50, "imgsz": 640, "batch": 16},
    # 媒体创作：AI 修图 / AI 电影（单段视频）。每个能力独立选择开源本地或厂商 API。
    "media": {
        "image": {
            "active": "auto",  # auto（优先有 key 的厂商，否则 local）| ark | openai | local
            "ark": {"enabled": True, "api_key": "",
                    "base_url": "https://ark.cn-beijing.volces.com/api/v3",
                    "model": "doubao-seedream-3-0-t2i-250415"},
            "openai": {"enabled": False, "api_key": "",
                       "base_url": "https://api.openai.com/v1", "model": "gpt-image-1"},
            "local": {"enabled": False, "model": "stabilityai/stable-diffusion-2-1"},
        },
        "video": {
            "active": "auto",  # auto | ark | local
            "ark": {"enabled": True, "api_key": "",
                    "base_url": "https://ark.cn-beijing.volces.com/api/v3",
                    "model": "doubao-seedance-1-0-lite-t2v-250428"},
            "local": {"enabled": False, "model": ""},
        },
    },
    "orchestrator_prompt": (
        "你是总控调度器。把用户需求拆解为清晰步骤，分配给规划师、执行者、审查员，"
        "最后整合各方结果，输出准确、简洁、可执行的最终答复。"
    ),
    "agents": [
        {"key": "planner", "name": "规划师", "enabled": True,
         "system_prompt": "你是规划师。把目标拆成有序、可执行的步骤，标注每步要点与风险，不要执行，只输出计划。"},
        {"key": "executor", "name": "执行者", "enabled": True,
         "system_prompt": "你是执行者。严格按计划逐步完成任务，给出具体结果与产物；遇到不确定处明确说明假设。"},
        {"key": "reviewer", "name": "审查员", "enabled": True,
         "system_prompt": "你是审查员。检查执行结果的正确性、完整性与风险，指出问题并给出修正建议。"},
    ],
    "skills": {
        "web_search": {"enabled": False, "provider": "duckduckgo", "api_key": ""},
        "code": {"enabled": True, "timeout": 10},
        "file": {"enabled": True, "sandbox": "data/sandbox"},
        "shell": {"enabled": False, "timeout": 10},
    },
    "mcp": [],  # 每项: {"name","type":"stdio|http","command","args","url","enabled"}
}

_lock = threading.Lock()
_cache: dict | None = None


def _deep_merge(base: dict, override: dict) -> dict:
    """以 base 为骨架，用 override 覆盖；保证升级后新默认键自动出现。"""
    out = copy.deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def _migrate_legacy_json() -> dict | None:
    """旧版 runtime_config.json 一次性迁移到 DB；迁移后改名为 .migrated 备份。"""
    if not CONFIG_PATH.exists():
        return None
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None
    db.set_config(data)
    try:
        CONFIG_PATH.rename(CONFIG_PATH.with_suffix(".json.migrated"))
    except Exception:
        pass
    return data


def load() -> dict:
    global _cache
    with _lock:
        if _cache is not None:
            return copy.deepcopy(_cache)
        data = db.get_config()
        if data is None:
            # DB 为空：尝试从旧 JSON 迁移，否则用默认值并写入 DB。
            data = _migrate_legacy_json()
            if data is None:
                data = {}
                db.set_config(_deep_merge(DEFAULT, data))
        _cache = _deep_merge(DEFAULT, data)
        return copy.deepcopy(_cache)


def save(cfg: dict) -> dict:
    global _cache
    with _lock:
        _cache = _deep_merge(DEFAULT, cfg)
        db.set_config(_cache)
        return copy.deepcopy(_cache)


def update(patch: dict) -> dict:
    """深度合并补丁并保存，返回最新配置。"""
    return save(_deep_merge(load(), patch))


def reset() -> dict:
    global _cache
    with _lock:
        _cache = None
    return save(copy.deepcopy(DEFAULT))


def abspath(rel: str) -> str:
    p = Path(rel)
    return str(p if p.is_absolute() else (ROOT / p))
