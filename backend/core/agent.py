"""单个 Agent：由（微调）模型或 DeepSeek API 驱动，按各自系统提示词执行任务。"""
from __future__ import annotations

from . import providers
from .. import config


class Agent:
    def __init__(self, key: str, name: str, system_prompt: str):
        self.key = key
        self.name = name
        self.system_prompt = system_prompt

    def run(self, task: str, context: str = "") -> str:
        prompt = task if not context else f"已知上下文：\n{context}\n\n任务：\n{task}"
        return providers.generate(prompt, system=self.system_prompt)


def get_specs() -> list[dict]:
    return config.load()["agents"]


def find(agent_key: str) -> Agent | None:
    for a in config.load()["agents"]:
        if a["key"] == agent_key:
            return Agent(a["key"], a["name"], a["system_prompt"])
    return None
