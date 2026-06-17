import { useEffect, useRef, useState, useCallback } from "react";
import type { WSMessage } from "../api/client";

// 单条共享的 WebSocket，连接 /ws/logs，自动重连。
// 组件传入 onMessage 回调即可消费实时消息。
export function useLogSocket(onMessage: (msg: WSMessage) => void) {
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws/logs`);
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try {
          cbRef.current(JSON.parse(e.data) as WSMessage);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws?.close();
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return connected;
}

// 累积某个 task_id 的日志行（用于训练日志面板）
export function useTaskLog() {
  const [lines, setLines] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string>("");
  const taskRef = useRef(taskId);
  taskRef.current = taskId;

  const handle = useCallback((msg: WSMessage) => {
    if (taskRef.current && msg.task_id !== taskRef.current) return;
    if (msg.type === "log" && msg.payload.text != null) {
      setLines((prev) => [...prev, String(msg.payload.text)]);
    } else if (msg.type === "done") {
      setLines((prev) => [...prev, msg.payload.stopped ? "■ 已停止" : "✅ 完成"]);
    } else if (msg.type === "error") {
      setLines((prev) => [...prev, `⚠️ 出错：${msg.payload.message ?? ""}`]);
    }
  }, []);

  const connected = useLogSocket(handle);
  const reset = useCallback((id: string) => {
    setTaskId(id);
    setLines([]);
  }, []);

  return { lines, reset, connected, taskId };
}
