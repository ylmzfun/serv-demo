"""FastAPI 入口：挂载 REST 路由 & /ws/logs WebSocket。

启动：uvicorn backend.main:app --reload --port 8000
（在 backend/ 目录内可用 uvicorn main:app）
"""
from __future__ import annotations
import asyncio
import sys
from pathlib import Path

# 允许 `cd backend && uvicorn main:app`：把项目根加入 sys.path，使 `backend` 可作为包导入。
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from backend import config  # noqa: E402
from backend.tasks import hub  # noqa: E402
from backend.core.engine import Engine  # noqa: E402
from backend.core.trainer_yolo import YoloTrainer  # noqa: E402
from backend.api import agents, llm, yolo, skills, mcp, files  # noqa: E402

app = FastAPI(title="MLX-Agent-Train", version="0.1.0")

# 开发期允许前端 Vite (localhost:5173) 跨域；生产可按需收紧。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (agents.router, llm.router, yolo.router, skills.router, mcp.router, files.router):
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
