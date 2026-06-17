import { useRef, useState } from "react";
import { api, type ChatMessage } from "../api/client";
import { Card, Section, Button } from "../components/ui";

export function Chat() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [useAdapter, setUseAdapter] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...history, { role: "user" as const, content: text }];
    setHistory(next);
    setInput("");
    setBusy(true);
    try {
      const r = await api.llmChat(next, useAdapter, false);
      setHistory([...next, { role: "assistant", content: r.reply }]);
    } catch (e: any) {
      setHistory([...next, { role: "assistant", content: `⚠️ ${e.message}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => boxRef.current?.scrollTo(0, boxRef.current.scrollHeight), 50);
    }
  };

  return (
    <Card>
      <Section title="与模型对话" desc="直接和当前模型聊天；勾选后使用你微调的 LoRA 权重。" />
      <label className="inline" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={useAdapter} onChange={(e) => setUseAdapter(e.target.checked)} />
        使用微调权重（LoRA）
      </label>
      <div className="chat-box" ref={boxRef}>
        {history.length === 0 && <div className="hint">开始对话吧。</div>}
        {history.map((m, i) => (
          <div className={`msg ${m.role}`} key={i}>
            <div className="bubble">{m.content}</div>
          </div>
        ))}
        {busy && <div className="msg assistant"><div className="bubble">…</div></div>}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="col" style={{ flex: 8 }}>
          <textarea
            rows={2}
            value={input}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
        </div>
        <div className="inline" style={{ flex: 1 }}>
          <Button variant="primary" onClick={send} disabled={busy}>发送</Button>
          <Button onClick={() => setHistory([])}>清空</Button>
        </div>
      </div>
    </Card>
  );
}
