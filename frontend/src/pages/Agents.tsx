import { useEffect, useState } from "react";
import { api, type AgentSpec } from "../api/client";
import { Card, Section, Field, Button, Notice } from "../components/ui";

export function Agents() {
  const [agents, setAgents] = useState<AgentSpec[]>([]);
  const [sel, setSel] = useState<string>("");
  const [draft, setDraft] = useState<AgentSpec | null>(null);
  const [orch, setOrch] = useState("");
  const [msg, setMsg] = useState("");
  const [newA, setNewA] = useState<AgentSpec>({ key: "", name: "", enabled: true, system_prompt: "" });

  const reload = async () => {
    const r = await api.listAgents();
    setAgents(r.agents);
    setOrch(r.orchestrator_prompt);
    if (!sel && r.agents[0]) {
      setSel(r.agents[0].key);
      setDraft(r.agents[0]);
    }
  };
  useEffect(() => {
    reload();
  }, []);

  const pick = (key: string) => {
    setSel(key);
    setDraft(agents.find((a) => a.key === key) ?? null);
  };

  const save = async () => {
    if (!draft) return;
    await api.saveAgent(draft);
    setMsg(`已保存：${draft.name}`);
    await reload();
  };
  const remove = async () => {
    if (!draft) return;
    await api.deleteAgent(draft.key);
    setMsg(`已删除：${draft.name}`);
    setSel("");
    setDraft(null);
    await reload();
  };
  const add = async () => {
    if (!newA.key.trim() || !newA.name.trim()) {
      setMsg("请填写 key 与名称");
      return;
    }
    await api.saveAgent(newA);
    setMsg(`已新增：${newA.name}`);
    setNewA({ key: "", name: "", enabled: true, system_prompt: "" });
    await reload();
  };
  const saveOrch = async () => {
    await api.saveOrchestrator(orch);
    setMsg("已保存总控提示词");
  };

  return (
    <div>
      <Card>
        <Section title="Agent 管理" desc="编辑每个 Agent 的名称、角色提示词与启用状态。" />
        <Notice text={msg} />
      </Card>
      <div className="grid2">
        <Card>
          <Section title="编辑 Agent" />
          <Field label="选择 Agent">
            <select value={sel} onChange={(e) => pick(e.target.value)}>
              {agents.map((a) => (
                <option key={a.key} value={a.key}>{a.name}</option>
              ))}
            </select>
          </Field>
          {draft && (
            <>
              <Field label="key（标识，不建议改）">
                <input type="text" value={draft.key} disabled />
              </Field>
              <Field label="名称">
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <label className="inline" style={{ marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                />
                参与调度
              </label>
              <Field label="角色系统提示词">
                <textarea
                  rows={6}
                  value={draft.system_prompt}
                  onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })}
                />
              </Field>
              <div className="inline">
                <Button variant="primary" onClick={save}>保存</Button>
                <Button variant="danger" onClick={remove}>删除</Button>
              </div>
            </>
          )}
        </Card>

        <div>
          <Card>
            <Section title="新增 Agent" />
            <Field label="key">
              <input
                type="text"
                value={newA.key}
                placeholder="如 researcher"
                onChange={(e) => setNewA({ ...newA, key: e.target.value })}
              />
            </Field>
            <Field label="名称">
              <input
                type="text"
                value={newA.name}
                placeholder="如 调研员"
                onChange={(e) => setNewA({ ...newA, name: e.target.value })}
              />
            </Field>
            <Field label="角色系统提示词">
              <textarea
                rows={4}
                value={newA.system_prompt}
                onChange={(e) => setNewA({ ...newA, system_prompt: e.target.value })}
              />
            </Field>
            <Button variant="primary" onClick={add}>新增</Button>
          </Card>
          <Card>
            <Section title="总控（Orchestrator）" desc="总控负责拆解需求与最终汇总。" />
            <textarea rows={5} value={orch} onChange={(e) => setOrch(e.target.value)} />
            <div style={{ marginTop: 10 }}>
              <Button variant="primary" onClick={saveOrch}>保存总控提示词</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
