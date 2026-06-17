import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Section, Field, Button, Notice } from "../components/ui";

interface Server {
  name: string;
  type: "stdio" | "http";
  command: string;
  args: string[];
  url: string;
  enabled: boolean;
}

const EMPTY: Server = { name: "", type: "stdio", command: "", args: [], url: "", enabled: true };

export function Mcp() {
  const [servers, setServers] = useState<Server[]>([]);
  const [form, setForm] = useState<Server>(EMPTY);
  const [argsStr, setArgsStr] = useState("");
  const [sel, setSel] = useState("");
  const [result, setResult] = useState("");
  const [msg, setMsg] = useState("");

  const reload = () => api.listMcp().then((r) => setServers(r.servers));
  useEffect(() => {
    reload();
  }, []);

  const add = async () => {
    if (!form.name.trim()) {
      setMsg("请填写服务器名称");
      return;
    }
    await api.addMcp({ ...form, args: argsStr.split(/\s+/).filter(Boolean) });
    setMsg(`已添加 / 更新：${form.name}`);
    setForm(EMPTY);
    setArgsStr("");
    await reload();
  };
  const del = async (name: string) => {
    await api.deleteMcp(name);
    await reload();
  };
  const test = async () => {
    if (!sel) return;
    setResult("测试中…");
    const r = await api.testMcp(sel);
    setResult(r.result);
  };

  return (
    <div>
      <Card>
        <Section title="MCP 接入" desc="添加 stdio 或 http 服务器（JSON-RPC）。" />
        {servers.length === 0 ? (
          <div className="hint">暂无 MCP 服务器。用下方表单添加。</div>
        ) : (
          <table className="list">
            <thead>
              <tr><th>名称</th><th>类型</th><th>状态</th><th>目标</th><th>操作</th></tr>
            </thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>{s.type}</td>
                  <td>{s.enabled ? "启用" : "停用"}</td>
                  <td>{s.type === "http" ? s.url : `${s.command} ${s.args.join(" ")}`.trim()}</td>
                  <td><Button variant="danger" onClick={() => del(s.name)}>删除</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid2">
        <Card>
          <Section title="添加 / 更新服务器" />
          <Field label="名称">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="row">
            <div className="col">
              <Field label="类型">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                  <option value="stdio">stdio</option>
                  <option value="http">http</option>
                </select>
              </Field>
            </div>
            <div className="col">
              <label className="inline" style={{ marginTop: 26 }}>
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                启用
              </label>
            </div>
          </div>
          {form.type === "stdio" ? (
            <>
              <Field label="command">
                <input type="text" value={form.command} placeholder="如 python" onChange={(e) => setForm({ ...form, command: e.target.value })} />
              </Field>
              <Field label="args（空格分隔）">
                <input type="text" value={argsStr} placeholder="如 server.py" onChange={(e) => setArgsStr(e.target.value)} />
              </Field>
            </>
          ) : (
            <Field label="url">
              <input type="text" value={form.url} placeholder="http://localhost:8080/rpc" onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </Field>
          )}
          <div className="inline">
            <Button variant="primary" onClick={add}>添加 / 更新</Button>
            <Notice text={msg} />
          </div>
        </Card>

        <Card>
          <Section title="测试连接" />
          <Field label="选择服务器">
            <select value={sel} onChange={(e) => setSel(e.target.value)}>
              <option value="">—</option>
              {servers.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Button variant="primary" onClick={test}>测试连接</Button>
          <div className="logbox" style={{ marginTop: 12, minHeight: 120 }}>
            {result || "（测试结果显示在这里）"}
          </div>
        </Card>
      </div>
    </div>
  );
}
