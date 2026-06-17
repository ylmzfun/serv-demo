"""Skill 开关 & 测试台路由。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import config
from ..core.skills import registry
from ..schemas import SkillTestRequest

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("")
def list_skills():
    flags = config.load()["skills"]
    return {"skills": [
        {"key": s.key, "name": s.name, "description": s.description,
         "config": flags.get(s.key, {})}
        for s in registry.all()
    ]}


@router.put("")
def update_skills(body: dict):
    """整体更新 skills 配置块。前端提交完整的 skills 字典。"""
    config.update({"skills": body})
    return {"ok": True, "skills": config.load()["skills"]}


@router.post("/{key}/test")
def test_skill(key: str, req: SkillTestRequest):
    sk = registry.get(key)
    if not sk:
        raise HTTPException(404, f"未找到技能：{key}")
    return {"output": sk.run(req.query or "")}
