/*
 * @Author: ylmzfun ylmzfun@163.com
 * @Date: 2026-06-17 23:08:36
 * @LastEditors: ylmzfun ylmzfun@163.com
 * @LastEditTime: 2026-06-18 00:08:25
 * @FilePath: /mlx-agent-train/frontend/src/App.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState } from "react";
import { api } from "./api/client";
import { AgentHub } from "./pages/AgentHub";
import { LlmHub } from "./pages/LlmHub";
import { YoloHub } from "./pages/YoloHub";
import { Files } from "./pages/Files";
import { Logs } from "./pages/Logs";
import { Skills } from "./pages/Skills";
import { Mcp } from "./pages/Mcp";
import { History } from "./pages/History";

const TABS: { key: string; label: string; el: () => JSX.Element }[] = [
  { key: "agent", label: "🤖 Agent", el: () => <AgentHub /> },
  { key: "llm", label: "🧠 模型 & 对话", el: () => <LlmHub /> },
  { key: "yolo", label: "🧩 YOLO", el: () => <YoloHub /> },
  { key: "skills", label: "🛠 Skill", el: () => <Skills /> },
  { key: "mcp", label: "🔌 MCP", el: () => <Mcp /> },
  { key: "files", label: "📁 文件 & 数据", el: () => <Files /> },
  { key: "logs", label: "📋 日志", el: () => <Logs /> },
  { key: "history", label: "📜 历史", el: () => <History /> },
];

export default function App() {
  const [tab, setTab] = useState("agent");
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ ok: false }));
  }, []);

  const dotCls = !health ? "warn" : health.mlx_available ? "ok" : "warn";
  const statusText = !health
    ? "连接后端中…"
    : health.mlx_available
      ? "MLX 就绪"
      : "MLX 未就绪（界面可用，推理不可用）";

  const Active = TABS.find((t) => t.key === tab)!.el;

  return (
    <div className="app">
      <div className="brand">
        <div>
          <div className="title">MLX-Agent-Train</div>
          <div className="sub">
            多 Agent 调度 · 大模型微调 · YOLO 训练 —— 全在页面内完成
          </div>
        </div>
        <div className="status">
          <span className={`dot ${dotCls}`} />
          {statusText}
          {health?.yolo_available === false && " · YOLO 未安装"}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}
