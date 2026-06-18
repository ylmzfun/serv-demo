"""SQLite 持久层：把配置、操作、任务&训练、日志四类数据固化到 backend/app.db。

设计要点：
- 仅依赖标准库；**不导入 config**（自行定位 db 路径），避免 config ↔ db 循环导入。
- 单一模块级连接（check_same_thread=False）+ 写锁：训练在后台线程写日志，必须线程安全。
- 开启 WAL，提升并发读（前端查询不阻塞写入）。
- 所有写入由调用方包在 try/except 里使用，落库失败不应影响实时广播。
"""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path

# backend/db.py -> backend/app.db（与 config.ROOT 同级，但此处不依赖 config）
DB_PATH = Path(__file__).resolve().parent / "app.db"

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None
_ready = False


def _connect() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.execute("PRAGMA synchronous=NORMAL")
        _ensure_schema(_conn)
    return _conn


_SCHEMA = """
    CREATE TABLE IF NOT EXISTS config_kv (
        key        TEXT PRIMARY KEY,
        value      TEXT,
        updated_at REAL
    );
    CREATE TABLE IF NOT EXISTS tasks (
        task_id     TEXT PRIMARY KEY,
        kind        TEXT,
        state       TEXT,
        created_at  REAL,
        finished_at REAL,
        meta        TEXT,
        final       TEXT
    );
    CREATE TABLE IF NOT EXISTS logs (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT,
        ts      REAL,
        type    TEXT,
        role    TEXT,
        content TEXT,
        payload TEXT
    );
    CREATE TABLE IF NOT EXISTS operations (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        ts          REAL,
        method      TEXT,
        path        TEXT,
        status      INTEGER,
        summary     TEXT,
        body        TEXT,
        duration_ms REAL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_task ON logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_ops_ts ON operations(ts);
"""


def _ensure_schema(conn: sqlite3.Connection) -> None:
    """建表 + 建索引（幂等）。首次连接时自动调用，亦可显式 init()。"""
    global _ready
    if _ready:
        return
    conn.executescript(_SCHEMA)
    conn.commit()
    _ready = True


def init() -> None:
    """应用启动时显式调用一次（建库 + 建表）。内部已惰性保证，重复调用无害。"""
    with _lock:
        _connect()


def _dumps(obj) -> str | None:
    if obj is None:
        return None
    try:
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        return str(obj)


# ----------------------------- 配置 -----------------------------
def get_config() -> dict | None:
    with _lock:
        row = _connect().execute(
            "SELECT value FROM config_kv WHERE key='runtime'").fetchone()
    if not row or not row["value"]:
        return None
    try:
        return json.loads(row["value"])
    except Exception:
        return None


def set_config(cfg: dict) -> None:
    with _lock:
        c = _connect()
        c.execute(
            "INSERT INTO config_kv(key, value, updated_at) VALUES('runtime', ?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
            (json.dumps(cfg, ensure_ascii=False), time.time()),
        )
        c.commit()


def config_updated_at() -> float | None:
    with _lock:
        row = _connect().execute(
            "SELECT updated_at FROM config_kv WHERE key='runtime'").fetchone()
    return row["updated_at"] if row else None


# ----------------------------- 任务 -----------------------------
def upsert_task(task_id: str, kind: str, created_at: float, meta: dict | None = None) -> None:
    with _lock:
        c = _connect()
        c.execute(
            "INSERT INTO tasks(task_id, kind, state, created_at, meta) "
            "VALUES(?, ?, 'running', ?, ?) "
            "ON CONFLICT(task_id) DO UPDATE SET kind=excluded.kind, meta=excluded.meta",
            (task_id, kind, created_at, _dumps(meta or {})),
        )
        c.commit()


def set_task_state(task_id: str, state: str, final: str | None = None) -> None:
    finished = time.time() if state in ("done", "stopped", "error") else None
    with _lock:
        c = _connect()
        c.execute(
            "UPDATE tasks SET state=?, "
            "finished_at=COALESCE(?, finished_at), "
            "final=COALESCE(?, final) WHERE task_id=?",
            (state, finished, final, task_id),
        )
        c.commit()


def list_tasks(limit: int = 200, kind: str | None = None) -> list[dict]:
    sql = "SELECT * FROM tasks"
    args: list = []
    if kind:
        sql += " WHERE kind=?"
        args.append(kind)
    sql += " ORDER BY created_at DESC LIMIT ?"
    args.append(int(limit))
    with _lock:
        rows = _connect().execute(sql, args).fetchall()
    return [_task_row(r) for r in rows]


def get_task(task_id: str) -> dict | None:
    with _lock:
        row = _connect().execute(
            "SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
    return _task_row(row) if row else None


def _task_row(r: sqlite3.Row) -> dict:
    return {
        "task_id": r["task_id"],
        "kind": r["kind"],
        "state": r["state"],
        "created_at": r["created_at"],
        "finished_at": r["finished_at"],
        "meta": json.loads(r["meta"]) if r["meta"] else {},
        "final": r["final"],
    }


# ----------------------------- 日志 -----------------------------
def add_log(task_id: str, type: str, role: str | None = None,
            content: str | None = None, payload: dict | None = None) -> None:
    with _lock:
        c = _connect()
        c.execute(
            "INSERT INTO logs(task_id, ts, type, role, content, payload) VALUES(?,?,?,?,?,?)",
            (task_id, time.time(), type, role, content, _dumps(payload)),
        )
        c.commit()


def get_logs(task_id: str, limit: int = 5000) -> list[dict]:
    with _lock:
        rows = _connect().execute(
            "SELECT * FROM logs WHERE task_id=? ORDER BY id ASC LIMIT ?",
            (task_id, int(limit)),
        ).fetchall()
    return [
        {
            "id": r["id"], "ts": r["ts"], "type": r["type"], "role": r["role"],
            "content": r["content"],
            "payload": json.loads(r["payload"]) if r["payload"] else None,
        }
        for r in rows
    ]


# ----------------------------- 操作 -----------------------------
def add_operation(method: str, path: str, status: int, summary: str = "",
                  body=None, duration_ms: float = 0.0) -> None:
    with _lock:
        c = _connect()
        c.execute(
            "INSERT INTO operations(ts, method, path, status, summary, body, duration_ms) "
            "VALUES(?,?,?,?,?,?,?)",
            (time.time(), method, path, int(status), summary, _dumps(body), float(duration_ms)),
        )
        c.commit()


def list_operations(limit: int = 200, method: str | None = None, q: str | None = None) -> list[dict]:
    sql = "SELECT * FROM operations"
    where, args = [], []
    if method:
        where.append("method=?")
        args.append(method.upper())
    if q:
        where.append("(path LIKE ? OR summary LIKE ?)")
        args += [f"%{q}%", f"%{q}%"]
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC LIMIT ?"
    args.append(int(limit))
    with _lock:
        rows = _connect().execute(sql, args).fetchall()
    return [
        {
            "id": r["id"], "ts": r["ts"], "method": r["method"], "path": r["path"],
            "status": r["status"], "summary": r["summary"],
            "body": json.loads(r["body"]) if r["body"] else None,
            "duration_ms": r["duration_ms"],
        }
        for r in rows
    ]
