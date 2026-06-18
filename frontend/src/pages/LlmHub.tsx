import { useState } from "react";
import { SubTabs } from "../components/ui";
import { LlmTrain } from "./LlmTrain";
import { Chat } from "./Chat";

// 模型微调 + 对话 整合页。
export function LlmHub() {
  const [sub, setSub] = useState("train");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "train", label: "🧠 模型 & 微调" },
          { key: "chat", label: "💬 对话" },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "train" ? <LlmTrain /> : <Chat />}
    </div>
  );
}
