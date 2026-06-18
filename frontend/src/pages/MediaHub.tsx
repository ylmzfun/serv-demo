import { useState } from "react";
import { SubTabs } from "../components/ui";
import { ImageEdit } from "./ImageEdit";
import { VideoGen } from "./VideoGen";
import { MediaProviders } from "./MediaProviders";

// AI 修图 + AI 电影 + 提供方设置 整合页。
export function MediaHub() {
  const [sub, setSub] = useState("image");
  return (
    <div>
      <SubTabs
        tabs={[
          { key: "image", label: "🖼 AI 修图" },
          { key: "video", label: "🎬 AI 电影" },
          { key: "providers", label: "⚙️ 提供方" },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === "image" ? <ImageEdit /> : sub === "video" ? <VideoGen /> : <MediaProviders />}
    </div>
  );
}
