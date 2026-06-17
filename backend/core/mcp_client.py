"""MCP 客户端骨架：stdio + http 双模式（JSON-RPC 2.0）。可逐个接通真实服务器。"""
from __future__ import annotations
import json
import subprocess


class MCPClient:
    def __init__(self, spec: dict):
        self.spec = spec
        self.name = spec.get("name", "mcp")
        self.type = spec.get("type", "stdio")

    def _rpc(self, method: str, params: dict | None = None) -> dict:
        return {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}

    def ping(self) -> str:
        """轻量连通性测试。返回可读结果，不抛异常。"""
        try:
            if self.type == "http":
                return self._http_call("tools/list")
            return self._stdio_call("tools/list")
        except Exception as e:
            return f"连接失败：{e}"

    def _http_call(self, method: str, params: dict | None = None) -> str:
        import requests
        url = self.spec.get("url", "")
        if not url:
            return "未配置 url。"
        r = requests.post(url, json=self._rpc(method, params), timeout=15)
        return json.dumps(r.json(), ensure_ascii=False, indent=2)

    def _stdio_call(self, method: str, params: dict | None = None) -> str:
        command = self.spec.get("command", "")
        args = self.spec.get("args", []) or []
        if not command:
            return "未配置 command。"
        proc = subprocess.Popen(
            [command, *args], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True)
        try:
            msg = json.dumps(self._rpc(method, params)) + "\n"
            out, err = proc.communicate(msg, timeout=15)
            return (out or err or "（无响应）").strip()
        finally:
            if proc.poll() is None:
                proc.terminate()


def test_server(spec: dict) -> str:
    return MCPClient(spec).ping()
