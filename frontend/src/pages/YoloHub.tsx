import { useState } from "react";
import { SubTabs } from "../components/ui";
import { YoloTrain } from "./YoloTrain";
import { YoloDetect } from "./YoloDetect";

// YOLO 微调 + 物体识别 整合页。
export function YoloHub() {
  const [sub, setSub] = useState("train");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "train", label: "🧩 YOLO 微调" },
          { key: "detect", label: "🔍 物体识别" },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "train" ? <YoloTrain /> : <YoloDetect />}
    </div>
  );
}
