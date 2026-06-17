import { useEffect, useRef, useState } from "react";
import { api, type AgentSpec, type WSMessage } from "../api/client";
import { useLogSocket } from "../api/useLogSocket";
import { Card, Section, Button } from "../components/ui";

const ROLE_COLOR: Record<string, string> = {
  总控: "#4F46E5",
  规划师: "#2563EB",
  执行者: "#0D9488",
  审查员: "#D97706",
  "总控·汇总": "#4338CA",
  "直连 Agent": "#0D9488",
};

interface Step {
  role: string;
  content: string;
}

export function Dispatch() {
  const [mode, setMode] = useState<"orchestrate" | "single">("orchestrate");
  const [agents, setAgents] = useState<AgentSpec[]>([]);
  const [agentKey, setAgentKey] = useState("");
  const [request, setRequest] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [running, setRunning] = useState(false);
  const taskRef = useRef<string>("");

  useEffect(() => {
    api.listAgents().then((r) => {
      setAgents(r.agents);
      if (r.agents[0]) setAgentKey(r.agents[0].key);
    });
  }, []);

  useLogSocket((msg: WSMessage) => {
    if (taskRef.current && msg.task_id !== taskRef.current) return;
    if (msg.type === "agent_step") {
      setSteps((prev) => [...prev, { role: msg.payload.role, content: msg.payload.content }]);
    } else if (msg.type === "done" || msg.type === "error") {
      setRunning(false);
    }
  });

  const run = async () => {
    if (!request.trim()) return;
    setSteps([]);
    setRunning(true);
    try {
      const r = await api.dispatch(request, mode, agentKey);
      taskRef.current = r.task_id;
    } catch (e: any) {
      setRunning(false);
      setSteps([{ role: "错误", content: e.message }]);
    }
  };

  return (
    <div className="row">
      <div className="col" style={{ flex: 3 }}>
        <Card>
          <Section title="Agent 工作台" desc="输入需求，总控自动拆解并分发；也可直连单个 Agent。" />
          <label className="field">
            <span>运行方式</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="orchestrate">主控调度（规划→执行→审查→汇总）</option>
              <option value="single">直连单个 Agent</option>
            </select>
          </label>
          {mode === "single" && (
            <label className="field">
              <span>选择 Agent</span>
              <select value={agentKey} onChange={(e) => setAgentKey(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.key} value={a.key}>{a.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>你的需求</span>
            <textarea
              rows={5}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="例如：调研三种向量数据库并给出选型建议"
            />
          </label>
          <Button variant="primary" onClick={run} disabled={running}>
            {running ? "运行中…" : "运行"}
          </Button>
        </Card>
      </div>
      <div className="col" style={{ flex: 4 }}>
        <Card>
          <Section title="调度链路 / 结果" desc="总控 → 规划师 → 执行者 → 审查员 → 汇总，逐步显示。" />
          {steps.length === 0 ? (
            <div className="hint">结果会显示在这里。</div>
          ) : (
            steps.map((s, i) => (
              <div className="step" key={i}>
                <span className="step-badge" style={{ background: ROLE_COLOR[s.role] ?? "#4F46E5" }}>
                  {s.role}
                </span>
                <div className="step-body">{s.content}</div>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
