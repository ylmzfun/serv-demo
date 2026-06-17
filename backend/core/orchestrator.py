"""总控调度器：主控分发模式。拆解 → 规划师 → 执行者 → 审查员 → 汇总。

每完成一步通过 TaskHub 推送 agent_step，前端经 WebSocket 实时显示调度链路。
"""
from __future__ import annotations
from typing import Iterator

from .agent import Agent
from . import providers
from .. import config
from ..tasks import hub


def _build_agents() -> dict[str, Agent]:
    agents = {}
    for a in config.load()["agents"]:
        if a.get("enabled", True):
            agents[a["key"]] = Agent(a["key"], a["name"], a["system_prompt"])
    return agents


def run_single(agent_key: str, task: str) -> str:
    for a in config.load()["agents"]:
        if a["key"] == agent_key:
            return Agent(a["key"], a["name"], a["system_prompt"]).run(task)
    return f"未找到 Agent：{agent_key}"


def run_stream(request: str) -> Iterator[tuple[str, str]]:
    """逐步产出 (角色, 内容)。供同步调用或包装为后台任务。"""
    cfg = config.load()
    agents = _build_agents()
    yield ("总控", f"收到需求，开始拆解并分发：\n「{request}」")

    plan = ""
    if "planner" in agents:
        plan = agents["planner"].run(request)
        yield ("规划师", plan)

    result = ""
    if "executor" in agents:
        result = agents["executor"].run(request, context=plan)
        yield ("执行者", result)
    else:
        result = request

    review = ""
    if "reviewer" in agents:
        review = agents["reviewer"].run(result, context=f"原始需求：{request}")
        yield ("审查员", review)

    summary_prompt = (
        f"原始需求：{request}\n\n规划：{plan}\n\n执行结果：{result}\n\n"
        f"审查意见：{review}\n\n请整合以上，输出最终、准确、可直接使用的答复。"
    )
    final = providers.generate(summary_prompt, system=cfg["orchestrator_prompt"])
    yield ("总控·汇总", final)


def run_task(task_id: str, request: str, mode: str = "orchestrate", agent_key: str | None = None):
    """后台执行调度，把每步通过 hub 推送给前端。阻塞调用，放到线程里跑。"""
    try:
        if mode == "single" and agent_key:
            reply = run_single(agent_key, request)
            hub.agent_step(task_id, "直连 Agent", reply)
            hub.done(task_id, final=reply)
            return
        final = ""
        for role, content in run_stream(request):
            hub.agent_step(task_id, role, content)
            final = content
        hub.done(task_id, final=final)
    except Exception as e:  # pragma: no cover
        hub.error(task_id, str(e))
