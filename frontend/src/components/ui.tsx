import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return <div className="card">{children}</div>;
}

export function Section({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <div className="sec-t">{title}</div>
      {desc && <div className="sec-d">{desc}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      className={`btn ${variant ?? ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Notice({ text, error }: { text: string; error?: boolean }) {
  if (!text) return null;
  return <span className={error ? "error-text" : "notice"}>{text}</span>;
}

const PILL: Record<string, [string, string]> = {
  running: ["run", "● 进行中…"],
  done: ["ok", "✅ 已完成"],
  error: ["err", "⚠️ 出错"],
  stopped: ["warn", "■ 已停止"],
  idle: ["idle", "空闲"],
};

export function StatusPill({ state }: { state: string }) {
  const [cls, label] = PILL[state] ?? PILL.idle;
  return <span className={`pill ${cls}`}>{label}</span>;
}
