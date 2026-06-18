"""后台任务表 + 日志广播。

- 每个长任务（训练 / 调度）分配一个 task_id，状态与日志记录在内存任务表。
- 所有连接 /ws/logs 的客户端通过 broadcast() 收到统一格式的实时消息。
- 不依赖外部队列，单机 asyncio 即可。
"""
from __future__ import annotations
import asyncio
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import Any

from . import db


@dataclass
class Task:
    task_id: str
    kind: str                       # dispatch | llm_train | yolo_train
    state: str = "running"          # running | done | stopped | error
    created_at: float = field(default_factory=time.time)
    lines: deque[str] = field(default_factory=lambda: deque(maxlen=4000))
    meta: dict[str, Any] = field(default_factory=dict)


class TaskHub:
    """单例：管理任务表与 WebSocket 订阅者。"""

    def __init__(self):
        self._tasks: dict[str, Task] = {}
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None
        self._lock = asyncio.Lock()

    def bind_loop(self, loop: asyncio.AbstractEventLoop):
        """记录主事件循环，供后台线程跨线程投递消息。"""
        self._loop = loop

    # ----------------------------- 任务 -----------------------------
    def create(self, kind: str, **meta) -> Task:
        task = Task(task_id=uuid.uuid4().hex[:12], kind=kind, meta=meta)
        self._tasks[task.task_id] = task
        _safe_db(db.upsert_task, task.task_id, kind, task.created_at, meta)
        return task

    def get(self, task_id: str) -> Task | None:
        return self._tasks.get(task_id)

    def list(self) -> list[dict]:
        return [
            {"task_id": t.task_id, "kind": t.kind, "state": t.state,
             "created_at": t.created_at, "meta": t.meta}
            for t in sorted(self._tasks.values(), key=lambda x: x.created_at, reverse=True)
        ]

    # ----------------------------- 订阅 -----------------------------
    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=1000)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    # ----------------------------- 广播 -----------------------------
    def _emit(self, msg: dict):
        for q in list(self._subscribers):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                pass

    def broadcast(self, type_: str, task_id: str = "", **payload):
        """线程安全广播。后台训练线程亦可调用。"""
        msg = {"type": type_, "task_id": task_id, "payload": payload}
        if self._loop and self._loop.is_running():
            self._loop.call_soon_threadsafe(self._emit, msg)
        else:
            self._emit(msg)

    # ----------------------------- 便捷方法 -----------------------------
    def log(self, task_id: str, text: str):
        t = self.get(task_id)
        if t is not None:
            t.lines.append(text)
        _safe_db(db.add_log, task_id, "log", None, text, None)
        self.broadcast("log", task_id, text=text)

    def progress(self, task_id: str, **payload):
        _safe_db(db.add_log, task_id, "progress", None, None, payload)
        self.broadcast("progress", task_id, **payload)

    def agent_step(self, task_id: str, role: str, content: str):
        _safe_db(db.add_log, task_id, "agent_step", role, content, None)
        self.broadcast("agent_step", task_id, role=role, content=content)

    def done(self, task_id: str, **payload):
        t = self.get(task_id)
        if t is not None and t.state == "running":
            t.state = "done"
        _safe_db(db.set_task_state, task_id, "done", payload.get("final"))
        _safe_db(db.add_log, task_id, "done", None, None, payload)
        self.broadcast("done", task_id, **payload)

    def error(self, task_id: str, message: str):
        t = self.get(task_id)
        if t is not None:
            t.state = "error"
        _safe_db(db.set_task_state, task_id, "error", None)
        _safe_db(db.add_log, task_id, "error", None, message, None)
        self.broadcast("error", task_id, message=message)

    def stopped(self, task_id: str, **payload):
        t = self.get(task_id)
        if t is not None:
            t.state = "stopped"
        _safe_db(db.set_task_state, task_id, "stopped", None)
        _safe_db(db.add_log, task_id, "done", None, None, {"stopped": True, **payload})
        self.broadcast("done", task_id, stopped=True, **payload)


def _safe_db(fn, *args):
    """落库失败绝不影响实时广播。"""
    try:
        fn(*args)
    except Exception:
        pass


hub = TaskHub()
