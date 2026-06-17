import { useEffect, useRef, useState } from "react";
import { api, uploadFile } from "../api/client";
import { Card, Section, Button, Notice } from "../components/ui";

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function Files() {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => api.listFiles().then((r) => setFiles(r.files));
  useEffect(() => {
    reload();
  }, []);

  const onUpload = async (f?: File) => {
    if (!f) return;
    try {
      const r = await uploadFile("/api/files/upload", f);
      setErr(false);
      setMsg(`已上传 ${r.filename}（${fmtSize(r.size)}）`);
      await reload();
    } catch (e: any) {
      setErr(true);
      setMsg(e.message);
    }
  };

  const prepare = async (name: string) => {
    try {
      const r = await api.llmPrepare(name);
      setErr(false);
      setMsg(`✅ 已转换 ${name} · 训练 ${r.train} / 验证 ${r.valid} 条 → data/processed`);
    } catch (e: any) {
      setErr(true);
      setMsg(e.message);
    }
  };

  const remove = async (name: string) => {
    await api.deleteFile(name);
    await reload();
  };

  return (
    <Card>
      <Section title="训练文件 & 数据" desc="上传 CSV / JSON / JSONL，点「准备数据」自动转换并切分 train/valid。" />
      <div className="inline" style={{ marginBottom: 12 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,.jsonl,.tsv,.ndjson,.yaml,.yml,.zip"
          onChange={(e) => onUpload(e.target.files?.[0])}
          style={{ display: "none" }}
        />
        <Button variant="primary" onClick={() => fileRef.current?.click()}>选择并上传文件</Button>
        <Notice text={msg} error={err} />
      </div>
      {files.length === 0 ? (
        <div className="hint">还没有文件，先上传一个。</div>
      ) : (
        <table className="list">
          <thead>
            <tr><th>文件名</th><th>大小</th><th style={{ width: 200 }}>操作</th></tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>{fmtSize(f.size)}</td>
                <td>
                  <div className="inline">
                    <Button onClick={() => prepare(f.name)}>准备数据</Button>
                    <Button variant="danger" onClick={() => remove(f.name)}>删除</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
