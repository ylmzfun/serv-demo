import { useState } from "react";
import { SubTabs } from "../components/ui";
import { Dispatch } from "./Dispatch";
import { Agents } from "./Agents";

// Agent 调度 + Agent 管理 整合页。
export function AgentHub() {
  const [sub, setSub] = useState("dispatch");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "dispatch", label: "🎯 Agent 调度" },
          { key: "manage", label: "👥 Agent 管理" },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "dispatch" ? <Dispatch /> : <Agents />}
    </div>
  );
}
