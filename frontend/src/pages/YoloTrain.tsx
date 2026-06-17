import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useTaskLog } from "../api/useLogSocket";
import { Card, Section, Field, Button, Notice, StatusPill } from "../components/ui";

export function YoloTrain() {
  const [info, setInfo] = useState<any>(null);
  const [base, setBase] = useState("yolo11n.pt");
  const [dataYaml, setDataYaml] = useState("");
  const [epochs, setEpochs] = useState(50);
  const [imgsz, setImgsz] = useState(640);
  const [batch, setBatch] = useState(16);
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");
  const { lines, reset } = useTaskLog();
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.yoloModels().then((r) => {
      setInfo(r);
      setBase(r.current.base_model);
      setEpochs(r.current.epochs);
      setImgsz(r.current.imgsz);
      setBatch(r.current.batch);
    });
  }, []);
  useEffect(() => {
    logEnd.current?.scrollIntoView();
  }, [lines]);

  const start = async () => {
    if (!dataYaml.trim()) {
      setMsg("请填写 data.yaml 的相对路径（位于 data/ 下）");
      return;
    }
    try {
      const r = await api.yoloTrain({ base_model: base, data_yaml: dataYaml, epochs, imgsz, batch });
      reset(r.task_id);
      setState("running");
      setMsg("");
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  if (!info) return <Card>加载中…</Card>;

  return (
    <div className="row">
      <div className="col" style={{ flex: 2 }}>
        <Card>
          <Section title="YOLO 模型 & 微调" desc="切换模型版本、设置训练参数，一键微调。" />
          {!info.available && (
            <div className="hint" style={{ marginBottom: 12 }}>
              ⚠️ 后端未安装 ultralytics，YOLO 训练不可用。请 `uv pip install -e backend` 安装。
            </div>
          )}
          <Field label="基础模型版本">
            <select value={base} onChange={(e) => setBase(e.target.value)}>
              {info.choices.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="数据集 data.yaml（相对 data/ 路径）">
            <input
              type="text"
              value={dataYaml}
              placeholder="如 coco8/data.yaml"
              onChange={(e) => setDataYaml(e.target.value)}
            />
          </Field>
          <Field label={`训练轮数 epochs：${epochs}`}>
            <input type="range" min={1} max={300} step={1} value={epochs}
              onChange={(e) => setEpochs(+e.target.value)} />
          </Field>
          <Field label={`图像尺寸 imgsz：${imgsz}`}>
            <input type="range" min={320} max={1280} step={32} value={imgsz}
              onChange={(e) => setImgsz(+e.target.value)} />
          </Field>
          <Field label={`批大小 batch：${batch}`}>
            <input type="range" min={1} max={64} step={1} value={batch}
              onChange={(e) => setBatch(+e.target.value)} />
          </Field>
          <div className="inline">
            <Button variant="primary" onClick={start} disabled={state === "running" || !info.available}>
              开始训练
            </Button>
            <StatusPill state={state} />
          </div>
          <Notice text={msg} error />
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
  );
}
