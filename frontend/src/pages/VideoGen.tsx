import { useRef, useState } from "react";
import { postForm } from "../api/client";
import { useLogSocket } from "../api/useLogSocket";
import { Card, Section, Field, Button, Notice } from "../components/ui";

const RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"];

export function VideoGen() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [ratio, setRatio] = useState("16:9");
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
      const r = await postForm("/api/media/video", { prompt, duration, ratio }, file || undefined);
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
          <Section title="AI 电影制作" desc="提示词生成一段短视频（可选首帧图）。需在「⚙️ 提供方」配置 Seedance(Ark)。" />
          <Field label="提示词 / 分镜描述">
            <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：一只宇航员猫在月球漫步，电影质感，镜头缓缓推进" />
          </Field>
          <Field label={`时长（秒）：${duration}`}>
            <input type="range" min={3} max={12} step={1} value={duration}
              onChange={(e) => setDuration(+e.target.value)} />
          </Field>
          <Field label="画面比例">
            <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
              {RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="首帧参考图（可选）">
            <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
          </Field>
          {preview && <img className="detect-img" src={preview} alt="首帧" style={{ marginBottom: 12 }} />}
          <div className="inline">
            <Button variant="primary" onClick={submit} disabled={busy}>{busy ? "生成中…（视频较慢）" : "开始生成"}</Button>
            <Notice text={msg} error />
          </div>
        </Card>
      </div>
      <div className="col" style={{ flex: 3 }}>
        <Card>
          <Section title="生成结果" />
          {result ? (
            <>
              <video className="detect-img" src={result} controls style={{ width: "100%" }} />
              <div style={{ marginTop: 8 }}>
                <a className="btn" href={result} download target="_blank" rel="noreferrer">下载视频</a>
              </div>
            </>
          ) : (
            <div className="hint">视频生成通常需要数十秒到几分钟，完成后在此播放。</div>
          )}
          <div className="logbox" style={{ marginTop: 12 }}>
            {lines.length ? lines.join("\n") : "（提交后实时进度显示在这里）"}
          </div>
        </Card>
      </div>
    </div>
  );
}
