import { useEffect, useRef, useState } from "react";
import { api, uploadFile } from "../api/client";
import { Card, Section, Field, Button, Notice } from "../components/ui";

interface Detection {
  label: string;
  confidence: number | null;
  xyxy: number[];
}

export function YoloDetect() {
  const [info, setInfo] = useState<any>(null);
  const [weights, setWeights] = useState("");
  const [preview, setPreview] = useState("");
  const [dets, setDets] = useState<Detection[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.yoloModels().then(setInfo);
  }, []);

  const onPick = async (f?: File) => {
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setDets(null);
    setBusy(true);
    setMsg("");
    try {
      const r = await uploadFile("/api/yolo/detect", f, weights ? { weights } : {});
      setDets(r.detections);
      setMsg(`检测到 ${r.count} 个目标`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Section title="物体识别测试" desc="上传图片，直接验证识别效果。可选指定训练好的权重。" />
      {info && !info.available && (
        <div className="hint" style={{ marginBottom: 12 }}>
          ⚠️ 后端未安装 ultralytics，物体识别不可用。
        </div>
      )}
      <Field label="权重（留空用预置基础模型）">
        <select value={weights} onChange={(e) => setWeights(e.target.value)}>
          <option value="">（基础模型 {info?.current?.base_model ?? ""}）</option>
          {(info?.trained ?? []).map((w: string) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </Field>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <div className="inline" style={{ marginBottom: 12 }}>
        <Button variant="primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "识别中…" : "选择图片识别"}
        </Button>
        <Notice text={msg} />
      </div>
      {preview && (
        <div className="grid2">
          <img className="detect-img" src={preview} alt="预览" />
          <div>
            {dets === null ? (
              <div className="hint">识别结果将显示在这里。</div>
            ) : dets.length === 0 ? (
              <div className="hint">未检测到目标。</div>
            ) : (
              dets.map((d, i) => (
                <span className="tag" key={i}>
                  {d.label} {d.confidence != null ? `${(d.confidence * 100).toFixed(1)}%` : ""}
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
