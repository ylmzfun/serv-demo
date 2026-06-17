"""Skill 基类与注册表。新增技能：继承 BaseSkill，实现 run()，调用 registry.register()。"""
from __future__ import annotations


class BaseSkill:
    key = "base"
    name = "技能"
    description = ""

    def run(self, query: str, **kwargs) -> str:
        raise NotImplementedError


class SkillRegistry:
    def __init__(self):
        self._skills: dict[str, BaseSkill] = {}

    def register(self, skill: BaseSkill):
        self._skills[skill.key] = skill

    def get(self, key: str) -> BaseSkill | None:
        return self._skills.get(key)

    def all(self) -> list[BaseSkill]:
        return list(self._skills.values())


registry = SkillRegistry()
