"""内置 4 个技能：网页搜索 / 代码执行（沙箱+超时） / 文件读写（防越权） / Shell（黑名单）。"""
from __future__ import annotations
import sys
import subprocess
import tempfile
from pathlib import Path

from .base import BaseSkill, registry
from ... import config


class WebSearchSkill(BaseSkill):
    key = "web_search"
    name = "网页搜索"
    description = "联网检索。支持 DuckDuckGo / SerpAPI / Tavily（在能力页配置 provider 与 api_key）。"

    def run(self, query: str, **kw) -> str:
        cfg = config.load()["skills"]["web_search"]
        provider = cfg.get("provider", "duckduckgo")
        api_key = cfg.get("api_key", "")
        try:
            import requests  # noqa
        except Exception:
            return "未安装 requests，无法联网搜索。"
        try:
            if provider == "tavily" and api_key:
                r = requests.post("https://api.tavily.com/search",
                                  json={"api_key": api_key, "query": query, "max_results": 5}, timeout=15)
                items = r.json().get("results", [])
                return "\n".join(f"- {i.get('title')}: {i.get('url')}" for i in items) or "无结果。"
            if provider == "serpapi" and api_key:
                r = requests.get("https://serpapi.com/search",
                                 params={"q": query, "api_key": api_key, "engine": "google"}, timeout=15)
                items = r.json().get("organic_results", [])
                return "\n".join(f"- {i.get('title')}: {i.get('link')}" for i in items[:5]) or "无结果。"
            r = requests.get("https://api.duckduckgo.com/",
                             params={"q": query, "format": "json", "no_html": 1}, timeout=15)
            data = r.json()
            ans = data.get("AbstractText") or data.get("Answer") or ""
            related = [t.get("Text", "") for t in data.get("RelatedTopics", []) if isinstance(t, dict)][:5]
            body = (ans + "\n" + "\n".join(f"- {x}" for x in related if x)).strip()
            return body or "未找到摘要，建议配置 Tavily/SerpAPI 获得更完整结果。"
        except Exception as e:
            return f"搜索失败：{e}"


class CodeSkill(BaseSkill):
    key = "code"
    name = "代码执行"
    description = "在隔离子进程中运行 Python 代码，带超时保护。"

    def run(self, query: str, **kw) -> str:
        cfg = config.load()["skills"]["code"]
        timeout = int(cfg.get("timeout", 10))
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
            f.write(query)
            path = f.name
        try:
            r = subprocess.run([sys.executable, path], capture_output=True, text=True, timeout=timeout)
            out = (r.stdout or "") + (("\n[stderr]\n" + r.stderr) if r.stderr else "")
            return out.strip() or "（无输出）"
        except subprocess.TimeoutExpired:
            return f"执行超时（>{timeout}s）。"
        except Exception as e:
            return f"执行失败：{e}"
        finally:
            try:
                Path(path).unlink()
            except Exception:
                pass


class FileSkill(BaseSkill):
    key = "file"
    name = "文件读写"
    description = "在沙箱目录内读/写/列文件，禁止越权访问目录外路径。"

    def _safe(self, rel: str) -> Path:
        sandbox = Path(config.abspath(config.load()["skills"]["file"]["sandbox"])).resolve()
        sandbox.mkdir(parents=True, exist_ok=True)
        target = (sandbox / rel).resolve()
        if not str(target).startswith(str(sandbox)):
            raise PermissionError("越权访问被拒绝")
        return target

    def run(self, query: str, **kw) -> str:
        """query 形如: read <path> | write <path> ||| <content> | list"""
        parts = query.strip().split(maxsplit=1)
        op = parts[0] if parts else "list"
        try:
            if op == "list":
                sandbox = Path(config.abspath(config.load()["skills"]["file"]["sandbox"])).resolve()
                sandbox.mkdir(parents=True, exist_ok=True)
                return "\n".join(p.name for p in sandbox.iterdir()) or "（沙箱为空）"
            if op == "read":
                return self._safe(parts[1].strip()).read_text(encoding="utf-8")
            if op == "write":
                rest = parts[1]
                path, content = (rest.split("|||", 1) + [""])[:2]
                p = self._safe(path.strip())
                p.write_text(content.lstrip("\n"), encoding="utf-8")
                return f"已写入 {p.name}（{len(content)} 字符）。"
            return "用法: read <文件> | write <文件> ||| <内容> | list"
        except Exception as e:
            return f"文件操作失败：{e}"


class ShellSkill(BaseSkill):
    key = "shell"
    name = "Shell 命令"
    description = "执行 Shell 命令，含危险命令黑名单与超时。"
    BLACKLIST = ("rm -rf", "mkfs", ":(){", "dd if=", "shutdown", "reboot", "> /dev", "chmod -r 777 /", "mv / ")

    def run(self, query: str, **kw) -> str:
        cfg = config.load()["skills"]["shell"]
        timeout = int(cfg.get("timeout", 10))
        low = query.lower()
        if any(b in low for b in self.BLACKLIST):
            return "命令被安全黑名单拦截。"
        try:
            r = subprocess.run(query, shell=True, capture_output=True, text=True, timeout=timeout)
            out = (r.stdout or "") + (("\n[stderr]\n" + r.stderr) if r.stderr else "")
            return out.strip() or "（无输出）"
        except subprocess.TimeoutExpired:
            return f"执行超时（>{timeout}s）。"
        except Exception as e:
            return f"执行失败：{e}"


for _s in (WebSearchSkill(), CodeSkill(), FileSkill(), ShellSkill()):
    registry.register(_s)


def enabled_skills() -> list[BaseSkill]:
    flags = config.load()["skills"]
    return [s for s in registry.all() if flags.get(s.key, {}).get("enabled")]
