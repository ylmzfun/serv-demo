import { useRef, useState } from "react";
import { postForm } from "../api/client";
import { useLogSocket } from "../api/useLogSocket";
import { Card, Section, Field, Button, Notice } from "../components/ui";

const SIZES = ["1024x1024", "1024x1536", "1536x1024", "768x1024", "1024x768"];

export function ImageEdit() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const taskRef = useRef("");

  useLogSocket((m) => {
    if (!taskRef.current || m.task_id !== taskRef.current) return;
    if (m.type === "log") setLines((p) => [...p, String(m.payload.text)]);
    else if (m.type === "done") {
      if (m.payload.url) setResult(m.payload.url);
      setBusy(false);
    } else if (m.type === "error") {
      setLines((p) => [...p, `⚠️ ${m.payload.message ?? ""}`]);
      setBusy(false);
    }
  });

  const pick = (f?: File) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!prompt.trim()) {
      setMsg("请填写提示词");
      return;
    }
    setBusy(true);
    setMsg("");
    setLines([]);
    setResult("");
    try {
      const r = await postForm("/api/media/image", { prompt, size }, file || undefined);
      taskRef.current = r.task_id;
    } catch (e: any) {
      setMsg(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="row">
      <div className="col" style={{ flex: 2 }}>
        <Card>
          <Section title="AI 修图" desc="上传图片做编辑，或留空直接文生图。提供方在「⚙️ 提供方」配置。" />
          <Field label="提示词">
            <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：把背景换成黄昏的海边，保留人物" />
          </Field>
          <Field label="尺寸">
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="参考图（可选，留空=文生图）">
            <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
          </Field>
          {preview && <img className="detect-img" src={preview} alt="输入" style={{ marginBottom: 12 }} />}
          <div className="inline">
            <Button variant="primary" onClick={submit} disabled={busy}>{busy ? "生成中…" : "开始生成"}</Button>
            <Notice text={msg} error />
          </div>
        </Card>
      </div>
      <div className="col" style={{ flex: 3 }}>
        <Card>
          <Section title="生成结果" />
          {result ? (
            <>
              <img className="detect-img" src={result} alt="结果" />
              <div style={{ marginTop: 8 }}>
                <a className="btn" href={result} download target="_blank" rel="noreferrer">下载图片</a>
              </div>
            </>
          ) : (
            <div className="hint">生成结果会显示在这里。</div>
          )}
          <div className="logbox" style={{ marginTop: 12 }}>
            {lines.length ? lines.join("\n") : "（提交后实时进度显示在这里）"}
          </div>
        </Card>
      </div>
    </div>
  );
}
