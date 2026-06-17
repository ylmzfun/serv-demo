"""MCP 服务器管理路由。"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from .. import config
from ..core import mcp_client
from ..schemas import McpServer

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


@router.get("/servers")
def list_servers():
    return {"servers": config.load()["mcp"]}


@router.post("/servers")
def add_server(server: McpServer):
    cfg = config.load()
    cfg["mcp"] = [s for s in cfg["mcp"] if s["name"] != server.name]
    cfg["mcp"].append(server.model_dump())
    config.save(cfg)
    return {"ok": True, "servers": cfg["mcp"]}


@router.delete("/servers/{name}")
def delete_server(name: str):
    cfg = config.load()
    cfg["mcp"] = [s for s in cfg["mcp"] if s["name"] != name]
    config.save(cfg)
    return {"ok": True, "servers": cfg["mcp"]}


@router.post("/servers/{name}/test")
def test_server(name: str):
    for s in config.load()["mcp"]:
        if s["name"] == name:
            return {"result": mcp_client.test_server(s)}
    raise HTTPException(404, f"未找到服务器：{name}")
