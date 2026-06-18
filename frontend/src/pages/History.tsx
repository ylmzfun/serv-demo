import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Section, Button, StatusPill, SubTabs } from "../components/ui";

const fmt = (ts?: number | null) =>
  ts ? new Date(ts * 1000).toLocaleString() : "—";

function formatLog(l: any): string {
  if (l.type === "agent_step") return `【${l.role}】${l.content ?? ""}`;
  if (l.type === "log") return l.content ?? "";
  if (l.type === "progress") return `[进度] ${JSON.stringify(l.payload ?? {})}`;
  if (l.type === "done")
    return `[完成] ${l.payload ? JSON.stringify(l.payload) : ""}`;
  if (l.type === "error") return `[错误] ${l.content ?? ""}`;
  return l.content ?? "";
}

// 操作记录
function Operations() {
  const [rows, setRows] = useState<any[]>([]);
  const [method, setMethod] = useState("");
  const [q, setQ] = useState("");

  const load = () =>
    api.histOperations(method || undefined, q || undefined).then((r) => setRows(r.operations));
  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <Section title="操作记录" desc="所有改写类请求（POST/PUT/DELETE）已固化到 SQLite，可按方法 / 关键字检索。" />
      <div className="inline" style={{ marginBottom: 12 }}>
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">全部方法</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          type="text"
          placeholder="路径 / 摘要关键字"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Button variant="primary" onClick={load}>查询</Button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>时间</th><th>方法</th><th>路径</th><th>状态</th><th>耗时</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="hint">暂无记录</td></tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id}>
                  <td>{fmt(o.ts)}</td>
                  <td><span className={`pill ${o.status < 400 ? "ok" : "err"}`}>{o.method}</span></td>
                  <td>{o.path}</td>
                  <td>{o.status}</td>
                  <td>{Math.round(o.duration_ms)}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// 任务 & 训练
function Tasks() {
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);

  const reload = () => api.histTasks().then((r) => setRows(r.tasks));
  useEffect(() => {
    reload();
  }, []);
  const open = async (id: string) => setSel(await api.histTask(id));

  return (
    <div className="row">
      <div className="col" style={{ flex: 2 }}>
        <Card>
          <Section title="任务 & 训练" desc="调度 / LLM 训练 / YOLO 训练记录，点击查看完整日志与调度链路。" />
          <div className="inline" style={{ marginBottom: 8 }}>
            <Button onClick={reload}>刷新</Button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>类型</th><th>状态</th><th>创建时间</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={3} className="hint">暂无任务</td></tr>
                ) : (
                  rows.map((t) => (
                    <tr
                      key={t.task_id}
                      className={sel?.task?.task_id === t.task_id ? "active-row" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => open(t.task_id)}
                    >
                      <td>{t.kind}</td>
                      <td><StatusPill state={t.state} /></td>
                      <td>{fmt(t.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div className="col" style={{ flex: 3 }}>
        <Card>
          <Section title="任务详情 / 日志" />
          {!sel ? (
            <div className="hint">点击左侧任务查看日志。</div>
          ) : (
            <>
              <div className="sec-d">
                {sel.task?.kind} · {sel.task?.task_id} · 状态 {sel.task?.state} · 创建 {fmt(sel.task?.created_at)}
                {sel.task?.finished_at ? ` · 结束 ${fmt(sel.task?.finished_at)}` : ""}
              </div>
              <div className="logbox">
                {sel.logs.length === 0 ? "（无日志）" : sel.logs.map(formatLog).join("\n")}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// 配置快照
function ConfigSnapshot() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api.histConfig().then(setData);
  }, []);
  if (!data) return <Card>加载中…</Card>;
  return (
    <Card>
      <Section title="配置快照" desc={`来自 SQLite（config_kv）· 最近更新：${fmt(data.updated_at)}`} />
      <div className="logbox">{JSON.stringify(data.config, null, 2)}</div>
    </Card>
  );
}

export function History() {
  const [sub, setSub] = useState("ops");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "ops", label: "🧾 操作记录" },
          { key: "tasks", label: "🗂 任务 & 训练" },
          { key: "config", label: "⚙️ 配置快照" },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "ops" ? <Operations /> : sub === "tasks" ? <Tasks /> : <ConfigSnapshot />}
    </div>
  );
}
