import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Section, Field, Button, Notice } from "../components/ui";

// 单个厂商（ark / openai）的可编辑表单。
function Vendor({
  cap, vendor, info, onSave,
}: {
  cap: string; vendor: string; info: any;
  onSave: (cap: string, body: Record<string, any>) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(info.enabled);
  const [model, setModel] = useState(info.model);
  const [baseUrl, setBaseUrl] = useState(info.base_url);
  const [key, setKey] = useState("");

  return (
    <div className="card" style={{ background: "var(--bg)" }}>
      <div className="sec-t" style={{ textTransform: "uppercase" }}>{vendor}</div>
      <label className="inline" style={{ margin: "4px 0 10px" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        启用 · {info.has_key ? "已配置 Key" : "未配置 Key"}
      </label>
      <Field label="模型 ID">
        <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
      </Field>
      <Field label="Base URL">
        <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
      </Field>
      <Field label="API Key（留空保持不变）">
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
          placeholder={info.has_key ? "已配置，留空不变" : "填入厂商 API Key"} />
      </Field>
      <Button variant="primary" onClick={() => onSave(cap, {
        vendor, enabled, model, base_url: baseUrl, ...(key.trim() ? { api_key: key.trim() } : {}),
      })}>保存 {vendor}</Button>
    </div>
  );
}

function CapSettings({
  cap, title, vendors, status, onSave,
}: {
  cap: string; title: string; vendors: string[]; status: any;
  onSave: (cap: string, body: Record<string, any>) => Promise<void>;
}) {
  const s = status[cap];
  const [active, setActive] = useState(s.active);
  const activeOptions = cap === "image"
    ? ["auto", "ark", "openai", "local"]
    : ["auto", "ark", "local"];

  return (
    <Card>
      <Section title={title} desc={`当前实际使用：${s.resolved === "local" ? "本地开源" : s.resolved.toUpperCase()}`} />
      <div className="inline" style={{ marginBottom: 12 }}>
        <Field label="提供方策略">
          <select value={active} onChange={(e) => setActive(e.target.value)}>
            {activeOptions.map((o) => (
              <option key={o} value={o}>
                {o === "auto" ? "自动（优先有 Key 的厂商，否则本地）" : o === "local" ? "本地开源(diffusers)" : o.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="primary" onClick={() => onSave(cap, { active })}>保存策略</Button>
      </div>
      <div className="grid2">
        {vendors.map((v) => (
          <Vendor key={v} cap={cap} vendor={v} info={s[v]} onSave={onSave} />
        ))}
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        本地开源(diffusers)：{s.local.available ? "已就绪" : "未安装，缺包时该选项不可用（可改用厂商 API）"}
      </div>
    </Card>
  );
}

export function MediaProviders() {
  const [status, setStatus] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const reload = () => api.mediaProviders().then(setStatus);
  useEffect(() => {
    reload();
  }, []);

  const onSave = async (cap: string, body: Record<string, any>) => {
    await api.saveMediaProviders({ cap, ...body });
    setMsg(`已保存（${cap}）`);
    await reload();
  };

  if (!status) return <Card>加载中…</Card>;

  return (
    <div>
      <Card>
        <Section title="媒体提供方" desc="为 AI 修图与 AI 电影分别选择开源本地或厂商 API（如 Seedream / Seedance）。" />
        <Notice text={msg} />
      </Card>
      <CapSettings cap="image" title="🖼 AI 修图提供方" vendors={["ark", "openai"]} status={status} onSave={onSave} />
      <CapSettings cap="video" title="🎬 AI 电影提供方" vendors={["ark"]} status={status} onSave={onSave} />
    </div>
  );
}
