"""Agent 调度 & 管理路由。"""
from __future__ import annotations
import threading

from fastapi import APIRouter, HTTPException

from .. import config
from ..core import orchestrator
from ..tasks import hub
from ..schemas import DispatchRequest, AgentSpec, OrchestratorPrompt, TaskResponse

router = APIRouter(prefix="/api", tags=["agents"])


@router.post("/dispatch", response_model=TaskResponse)
def dispatch(req: DispatchRequest):
    """提交需求，启动 Agent 流水线，立即返回 task_id；进度走 WebSocket。"""
    if not req.request.strip():
        raise HTTPException(400, "需求不能为空。")
    task = hub.create("dispatch", mode=req.mode)
    threading.Thread(
        target=orchestrator.run_task,
        args=(task.task_id, req.request, req.mode, req.agent_key),
        daemon=True).start()
    return TaskResponse(task_id=task.task_id, message="调度已启动。")


@router.get("/agents")
def list_agents():
    return {"agents": config.load()["agents"],
            "orchestrator_prompt": config.load()["orchestrator_prompt"]}


@router.put("/agents/{key}")
def update_agent(key: str, spec: AgentSpec):
    cfg = config.load()
    for a in cfg["agents"]:
        if a["key"] == key:
            a.update(name=spec.name, enabled=spec.enabled, system_prompt=spec.system_prompt)
            config.save(cfg)
            return {"ok": True, "agent": a}
    # 不存在则新增
    cfg["agents"].append(spec.model_dump())
    config.save(cfg)
    return {"ok": True, "agent": spec.model_dump(), "created": True}


@router.delete("/agents/{key}")
def delete_agent(key: str):
    cfg = config.load()
    before = len(cfg["agents"])
    cfg["agents"] = [a for a in cfg["agents"] if a["key"] != key]
    if len(cfg["agents"]) == before:
        raise HTTPException(404, f"未找到 Agent：{key}")
    config.save(cfg)
    return {"ok": True}


@router.put("/orchestrator")
def update_orchestrator(body: OrchestratorPrompt):
    config.update({"orchestrator_prompt": body.prompt})
    return {"ok": True}
