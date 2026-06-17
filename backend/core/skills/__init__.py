"""Skill 子包：导入即注册内置技能。"""
from .base import BaseSkill, registry  # noqa: F401
from . import builtin  # noqa: F401  导入即注册
from .builtin import enabled_skills  # noqa: F401
