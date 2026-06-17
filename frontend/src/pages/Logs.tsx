import { useEffect, useRef, useState } from "react";
import { useLogSocket } from "../api/useLogSocket";
import type { WSMessage } from "../api/client";
import { Card, Section, Button } from "../components/ui";

function fmt(msg: WSMessage): string {
  const t = new Date().toLocaleTimeString();
  const id = msg.task_id ? `[${msg.task_id.slice(0, 6)}] ` : "";
  switch (msg.type) {
    case "log":
      return `${id}${msg.payload.text ?? ""}`;
    case "agent_step":
      return `${id}<${msg.payload.role}> ${String(msg.payload.content ?? "").slice(0, 200)}`;
    case "progress":
      return `${id}进度 ${JSON.stringify(msg.payload)}`;
    case "done":
      return `${id}✅ 完成`;
    case "error":
      return `${id}⚠️ ${msg.payload.message ?? ""}`;
    default:
      return `${t} ${id}${msg.type}`;
  }
}

export function Logs() {
  const [lines, setLines] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const connected = useLogSocket((msg) => {
    setLines((prev) => [...prev.slice(-1000), fmt(msg)]);
  });

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [lines]);

  return (
    <Card>
      <Section
        title="系统与训练日志"
        desc="通过 WebSocket 实时接收所有任务的日志、进度与调度链路。"
      />
      <div className="inline" style={{ marginBottom: 10 }}>
        <span className={`pill ${connected ? "ok" : "warn"}`}>
          {connected ? "● 已连接 /ws/logs" : "○ 未连接"}
        </span>
        <Button onClick={() => setLines([])}>清空</Button>
      </div>
      <div className="logbox">
        {lines.length ? lines.join("\n") : "（等待事件…触发训练或调度后这里实时显示）"}
        <div ref={endRef} />
      </div>
    </Card>
  );
}
