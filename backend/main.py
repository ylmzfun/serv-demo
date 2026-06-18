"""FastAPI 入口：挂载 REST 路由 & /ws/logs WebSocket。

启动：uvicorn backend.main:app --reload --port 8000
（在 backend/ 目录内可用 uvicorn main:app）
"""
from __future__ import annotations
import asyncio
import json
import sys
import time
from pathlib import Path

# 允许 `cd backend && uvicorn main:app`：把项目根加入 sys.path，使 `backend` 可作为包导入。
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from backend import config  # noqa: E402
from backend import db  # noqa: E402
from backend.tasks import hub  # noqa: E402
from backend.core.engine import Engine  # noqa: E402
from backend.core.trainer_yolo import YoloTrainer  # noqa: E402
from backend.api import agents, llm, yolo, skills, mcp, files, history  # noqa: E402

db.init()

app = FastAPI(title="MLX-Agent-Train", version="0.1.0")

# 开发期允许前端 Vite (localhost:5173) 跨域；生产可按需收紧。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 操作记录：把所有改写类请求（POST/PUT/DELETE）固化到 operations 表，便于回溯查询。
# 仅对真正机密的字段脱敏（如 api_key / token），避免误伤 agent_key 等普通标识。
_SENSITIVE = ("api_key", "apikey", "secret", "token", "password", "passwd")


def _redact(obj):
    """递归脱敏：键名含敏感词的值替换为 ***，避免 api_key 等明文落库。"""
    if isinstance(obj, dict):
        return {
            k: ("***" if isinstance(k, str) and any(s in k.lower() for s in _SENSITIVE) and v
                else _redact(v))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact(x) for x in obj]
    return obj


@app.middleware("http")
async def _record_operation(request: Request, call_next):
    if request.method not in ("POST", "PUT", "DELETE"):
        return await call_next(request)

    raw = await request.body()  # 读出后需重新放回，供下游处理
    body = None
    if raw:
        try:
            body = _redact(json.loads(raw))
        except Exception:
            body = {"_raw": raw[:200].decode("utf-8", "replace")}

    async def _receive():
        return {"type": "http.request", "body": raw, "more_body": False}
    request._receive = _receive

    start = time.time()
    response = await call_next(request)
    dur = (time.time() - start) * 1000.0

    try:
        db.add_operation(
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            summary=f"{request.method} {request.url.path}",
            body=body,
            duration_ms=dur,
        )
    except Exception:
        pass
    return response


for r in (agents.router, llm.router, yolo.router, skills.router,
          mcp.router, files.router, history.router):
    app.include_router(r)


@app.on_event("startup")
async def _bind_loop():
    hub.bind_loop(asyncio.get_running_loop())


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "mlx_available": Engine.instance().available,
        "yolo_available": YoloTrainer.instance().available,
        "tasks": hub.list(),
    }


@app.websocket("/ws/logs")
async def ws_logs(ws: WebSocket):
    """统一日志通道：推送 log / progress / agent_step / done / error。"""
    await ws.accept()
    q = hub.subscribe()
    try:
        while True:
            msg = await q.get()
            await ws.send_json(msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        hub.unsubscribe(q)


def main():
    import uvicorn
    uvicorn.run("backend.main:app", host=config.HOST, port=config.PORT, reload=False)


if __name__ == "__main__":
    main()
