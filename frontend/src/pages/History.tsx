import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { WSMessage } from "../api/client";
import { useLogSocket } from "../api/useLogSocket";
import { Card, Section, Button, StatusPill, SubTabs } from "../components/ui";

const fmt = (ts?: number | null) =>
  ts ? new Date(ts * 1000).toLocaleString() : "—";

// 历史（已固化）日志一行的格式化
function formatLog(l: any): string {
  if (l.type === "agent_step") return `【${l.role}】${l.content ?? ""}`;
  if (l.type === "log") return l.content ?? "";
  if (l.type === "progress") return `[进度] ${JSON.stringify(l.payload ?? {})}`;
  if (l.type === "done")
    return `[完成] ${l.payload ? JSON.stringify(l.payload) : ""}`;
  if (l.type === "error") return `[错误] ${l.content ?? ""}`;
  return l.content ?? "";
}

// 实时 WebSocket 事件一行的格式化
function fmtLive(msg: WSMessage): string {
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
      return `${id}${msg.type}`;
  }
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

// 日志 & 任务（实时日志 + 历史任务/训练，整合到一处）
function TasksAndLogs() {
  const [rows, setRows] = useState<any[]>([]);
  const [sel, setSel] = useState<string>("live"); // "live" 或某个 task_id
  const [detail, setDetail] = useState<any>(null);
  const [liveLines, setLiveLines] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const reload = () => api.histTasks().then((r) => setRows(r.tasks));
  useEffect(() => {
    reload();
  }, []);

  // 持续接收实时事件；任务结束/出错时刷新左侧列表，保证历史同步更新。
  const connected = useLogSocket((msg) => {
    setLiveLines((prev) => [...prev.slice(-1000), fmtLive(msg)]);
    if (msg.type === "done" || msg.type === "error") reload();
  });

  useEffect(() => {
    if (sel === "live") endRef.current?.scrollIntoView();
  }, [liveLines, sel]);

  const openLive = () => {
    setSel("live");
    setDetail(null);
  };
  const openTask = async (id: string) => {
    setSel(id);
    setDetail(null);
    setDetail(await api.histTask(id));
  };

  return (
    <div className="row">
      <div className="col" style={{ flex: 2 }}>
        <Card>
          <Section title="任务 & 训练" desc="顶部为全局实时日志；点击任意历史任务查看其完整日志与调度链路。" />
          <div className="inline" style={{ marginBottom: 8 }}>
            <Button onClick={reload}>刷新</Button>
            <span className={`pill ${connected ? "ok" : "warn"}`}>
              {connected ? "● 实时已连接" : "○ 未连接"}
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>类型</th><th>状态</th><th>时间</th></tr>
              </thead>
              <tbody>
                <tr
                  className={sel === "live" ? "active-row" : ""}
                  style={{ cursor: "pointer" }}
                  onClick={openLive}
                >
                  <td>🔴 实时日志</td>
                  <td><span className="pill run">直播</span></td>
                  <td>全部任务</td>
                </tr>
                {rows.map((t) => (
                  <tr
                    key={t.task_id}
                    className={sel === t.task_id ? "active-row" : ""}
                    style={{ cursor: "pointer" }}
                    onClick={() => openTask(t.task_id)}
                  >
                    <td>{t.kind}</td>
                    <td><StatusPill state={t.state} /></td>
                    <td>{fmt(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div className="col" style={{ flex: 3 }}>
        <Card>
          {sel === "live" ? (
            <>
              <Section title="实时日志" desc="WebSocket 实时接收所有任务的日志、进度与调度链路。" />
              <div className="inline" style={{ marginBottom: 8 }}>
                <Button onClick={() => setLiveLines([])}>清空</Button>
              </div>
              <div className="logbox">
                {liveLines.length ? liveLines.join("\n") : "（等待事件…触发训练 / 调度 / 生成后这里实时显示）"}
                <div ref={endRef} />
              </div>
            </>
          ) : detail ? (
            <>
              <Section title="任务日志" />
              <div className="sec-d">
                {detail.task?.kind} · {detail.task?.task_id} · 状态 {detail.task?.state} · 创建 {fmt(detail.task?.created_at)}
                {detail.task?.finished_at ? ` · 结束 ${fmt(detail.task?.finished_at)}` : ""}
              </div>
              <div className="logbox">
                {detail.logs.length ? detail.logs.map(formatLog).join("\n") : "（无日志）"}
              </div>
            </>
          ) : (
            <div className="hint">加载中…</div>
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
          { key: "tasklog", label: "📋 日志 & 任务" },
          { key: "config", label: "⚙️ 配置快照" },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "ops" ? <Operations /> : sub === "tasklog" ? <TasksAndLogs /> : <ConfigSnapshot />}
    </div>
  );
}
