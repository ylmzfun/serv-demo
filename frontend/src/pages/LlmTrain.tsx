import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useTaskLog } from "../api/useLogSocket";
import { Card, Section, Field, Button, Notice, StatusPill } from "../components/ui";

export function LlmTrain() {
  const [info, setInfo] = useState<any>(null);
  const [baseId, setBaseId] = useState("");
  const [custom, setCustom] = useState("");
  const [adapter, setAdapter] = useState("");
  const [useAdapter, setUseAdapter] = useState(false);
  const [temp, setTemp] = useState(0.7);
  const [maxTok, setMaxTok] = useState(512);
  const [rank, setRank] = useState(8);
  const [scale, setScale] = useState(20);
  const [layers, setLayers] = useState(16);
  const [msg, setMsg] = useState("");

  const [preset, setPreset] = useState("standard");
  const [iters, setIters] = useState(0);
  const [state, setState] = useState("idle");
  const { lines, reset } = useTaskLog();
  const logEnd = useRef<HTMLDivElement>(null);

  const [cmpQ, setCmpQ] = useState("");
  const [cmpBase, setCmpBase] = useState("");
  const [cmpFt, setCmpFt] = useState("");

  // 对话提供方（优先 DeepSeek API，回退本地 MLX）
  const [prov, setProv] = useState<any>(null);
  const [provActive, setProvActive] = useState("auto");
  const [dsEnabled, setDsEnabled] = useState(true);
  const [dsKey, setDsKey] = useState("");
  const [dsModel, setDsModel] = useState("deepseek-chat");
  const [dsBaseUrl, setDsBaseUrl] = useState("https://api.deepseek.com");
  const [provMsg, setProvMsg] = useState("");

  useEffect(() => {
    api.llmModels().then((r) => {
      setInfo(r);
      setBaseId(r.current.base_id);
      setAdapter(r.current.adapter_path);
      setUseAdapter(r.current.use_adapter);
      setTemp(r.current.temperature);
      setMaxTok(r.current.max_tokens);
      setRank(r.lora.rank);
      setScale(r.lora.scale);
      setLayers(r.lora.layers);
    });
    api.llmProvider().then((p) => {
      setProv(p);
      setProvActive(p.active);
      setDsEnabled(p.deepseek.enabled);
      setDsModel(p.deepseek.model);
      setDsBaseUrl(p.deepseek.base_url);
    });
  }, []);

  useEffect(() => {
    logEnd.current?.scrollIntoView();
  }, [lines]);

  const saveCfg = async () => {
    await api.llmConfig({
      base_id: custom.trim() || baseId,
      adapter_path: adapter || "models/llm/adapters",
      use_adapter: useAdapter,
      temperature: temp,
      max_tokens: maxTok,
      lora_rank: rank,
      lora_scale: scale,
      lora_layers: layers,
    });
    setMsg(`已保存 · 模型 ${custom.trim() || baseId} · LoRA(rank=${rank}, layers=${layers})`);
  };

  const startTrain = async () => {
    try {
      const r = await api.llmTrain(preset, iters || undefined);
      reset(r.task_id);
      setState("running");
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  const stopTrain = async () => {
    await api.llmStop();
    setState("stopped");
  };

  const saveProvider = async () => {
    const r = await api.saveProvider({
      active: provActive,
      deepseek_enabled: dsEnabled,
      deepseek_model: dsModel.trim(),
      deepseek_base_url: dsBaseUrl.trim(),
      ...(dsKey.trim() ? { deepseek_api_key: dsKey.trim() } : {}),
    });
    setProv(r);
    setDsKey("");
    const map: Record<string, string> = { deepseek: "DeepSeek API", mlx: "本地 MLX" };
    setProvMsg(`已保存 · 实际使用：${map[r.resolved] ?? r.resolved}`);
  };

  const compare = async () => {
    if (!cmpQ.trim()) return;
    setCmpBase("生成中…");
    setCmpFt("生成中…");
    const r = await api.llmChat([{ role: "user", content: cmpQ }], false, true);
    setCmpBase(r.base);
    setCmpFt(r.finetuned);
  };

  if (!info) return <Card>加载中…</Card>;

  return (
    <div>
      {/* 对话提供方 */}
      <Card>
        <Section
          title="对话提供方"
          desc="Agent 与对话优先走 DeepSeek API，未配置时自动回退到本地 MLX 模型。"
        />
        <div className="grid2">
          <Field label="提供方策略">
            <select value={provActive} onChange={(e) => setProvActive(e.target.value)}>
              <option value="auto">自动（优先 DeepSeek，回退 MLX）</option>
              <option value="deepseek">强制 DeepSeek API</option>
              <option value="mlx">强制本地 MLX</option>
            </select>
          </Field>
          <Field label="DeepSeek 模型">
            <input type="text" value={dsModel} onChange={(e) => setDsModel(e.target.value)}
              placeholder="deepseek-chat / deepseek-reasoner" />
          </Field>
          <Field label="DeepSeek API Key（留空则沿用已保存的 / 环境变量）">
            <input type="password" value={dsKey} onChange={(e) => setDsKey(e.target.value)}
              placeholder={prov?.deepseek?.has_key ? "已配置，留空保持不变" : "sk-..."} />
          </Field>
          <Field label="API Base URL">
            <input type="text" value={dsBaseUrl} onChange={(e) => setDsBaseUrl(e.target.value)} />
          </Field>
        </div>
        <label className="inline" style={{ margin: "4px 0 12px" }}>
          <input type="checkbox" checked={dsEnabled} onChange={(e) => setDsEnabled(e.target.checked)} />
          启用 DeepSeek
        </label>
        <div className="inline">
          <Button variant="primary" onClick={saveProvider}>保存提供方</Button>
          {prov && (
            <span className="pill ok">
              当前：{prov.resolved === "deepseek" ? "DeepSeek API" : "本地 MLX"}
            </span>
          )}
          <Notice text={provMsg} />
        </div>
      </Card>

      {/* 模型配置 */}
      <Card>
        <Section title="模型与生成参数" desc="切换基础模型、指定微调适配器、调温度与长度。保存即生效。" />
        <div className="grid2">
          <Field label="基础模型（预置）">
            <select value={baseId} onChange={(e) => setBaseId(e.target.value)}>
              {info.choices.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="或填任意 HuggingFace ID（留空用左侧）">
            <input type="text" value={custom} onChange={(e) => setCustom(e.target.value)} />
          </Field>
          <Field label="微调适配器目录">
            <input type="text" value={adapter} onChange={(e) => setAdapter(e.target.value)} />
          </Field>
          <Field label={`温度：${temp}`}>
            <input type="range" min={0} max={1.5} step={0.05} value={temp}
              onChange={(e) => setTemp(+e.target.value)} />
          </Field>
          <Field label={`最大生成长度：${maxTok}`}>
            <input type="range" min={64} max={2048} step={64} value={maxTok}
              onChange={(e) => setMaxTok(+e.target.value)} />
          </Field>
          <Field label={`LoRA rank：${rank}`}>
            <input type="range" min={2} max={64} step={2} value={rank}
              onChange={(e) => setRank(+e.target.value)} />
          </Field>
          <Field label={`LoRA scale：${scale}`}>
            <input type="range" min={2} max={64} step={2} value={scale}
              onChange={(e) => setScale(+e.target.value)} />
          </Field>
          <Field label={`LoRA 层数：${layers}`}>
            <input type="range" min={2} max={48} step={2} value={layers}
              onChange={(e) => setLayers(+e.target.value)} />
          </Field>
        </div>
        <label className="inline" style={{ margin: "4px 0 12px" }}>
          <input type="checkbox" checked={useAdapter} onChange={(e) => setUseAdapter(e.target.checked)} />
          启用微调权重（LoRA）
        </label>
        <div className="inline">
          <Button variant="primary" onClick={saveCfg}>保存配置</Button>
          <Notice text={msg} />
        </div>
      </Card>

      {/* 训练 */}
      <div className="row">
        <div className="col" style={{ flex: 2 }}>
          <Card>
            <Section title="一键微调" desc="选预置 → 开始训练，日志实时刷新，可随时停止。" />
            <Field label="训练预置">
              <select value={preset} onChange={(e) => setPreset(e.target.value)}>
                {Object.entries(info.presets).map(([k, label]) => (
                  <option key={k} value={k}>{label as string}</option>
                ))}
              </select>
            </Field>
            <Field label={`迭代步数（0 = 用预置默认）：${iters || "默认"}`}>
              <input type="range" min={0} max={2000} step={50} value={iters}
                onChange={(e) => setIters(+e.target.value)} />
            </Field>
            <div className="inline">
              <Button variant="primary" onClick={startTrain} disabled={state === "running"}>开始训练</Button>
              <Button onClick={stopTrain}>停止</Button>
              <StatusPill state={state} />
            </div>
          </Card>
        </div>
        <div className="col" style={{ flex: 3 }}>
          <Card>
            <Section title="训练日志" />
            <div className="logbox">
              {lines.length ? lines.join("\n") : "（点击开始训练后这里实时显示）"}
              <div ref={logEnd} />
            </div>
          </Card>
        </div>
      </div>

      {/* 对比测试 */}
      <Card>
        <Section title="微调前后对比" desc="同一问题，左为基础模型，右为微调模型。" />
        <Field label="测试问题">
          <textarea rows={2} value={cmpQ} onChange={(e) => setCmpQ(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={compare}>对比生成</Button>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div>
            <div className="sec-d">基础模型</div>
            <div className="step-body card">{cmpBase || "—"}</div>
          </div>
          <div>
            <div className="sec-d">微调模型</div>
            <div className="step-body card">{cmpFt || "—"}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
