"""历史查询路由：从 SQLite 读取操作记录、任务&训练、日志与配置快照。"""
from __future__ import annotations

from fastapi import APIRouter

from .. import config, db

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/tasks")
def tasks(limit: int = 200, kind: str | None = None):
    """任务 & 训练列表（dispatch / llm_train / yolo_train）。"""
    return {"tasks": db.list_tasks(limit=limit, kind=kind)}


@router.get("/tasks/{task_id}")
def task_detail(task_id: str, limit: int = 5000):
    """单个任务详情 + 其完整日志 / 调度链路。"""
    return {"task": db.get_task(task_id), "logs": db.get_logs(task_id, limit=limit)}


@router.get("/operations")
def operations(limit: int = 200, method: str | None = None, q: str | None = None):
    """操作记录（改写类请求），支持按方法与关键字过滤。"""
    return {"operations": db.list_operations(limit=limit, method=method, q=q)}


@router.get("/config")
def config_snapshot():
    """当前配置快照（来自 DB）+ 最近更新时间。"""
    return {"config": config.load(), "updated_at": db.config_updated_at()}
