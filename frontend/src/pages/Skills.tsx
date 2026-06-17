import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Section, Field, Button, Notice } from "../components/ui";

interface Skill {
  key: string;
  name: string;
  description: string;
  config: Record<string, any>;
}

export function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cfg, setCfg] = useState<Record<string, any>>({});
  const [msg, setMsg] = useState("");
  const [testKey, setTestKey] = useState("");
  const [testQ, setTestQ] = useState("");
  const [testOut, setTestOut] = useState("");

  useEffect(() => {
    api.listSkills().then((r) => {
      setSkills(r.skills);
      const c: Record<string, any> = {};
      for (const s of r.skills) c[s.key] = { ...s.config };
      setCfg(c);
      if (r.skills[0]) setTestKey(r.skills[0].key);
    });
  }, []);

  const set = (key: string, patch: Record<string, any>) =>
    setCfg((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const save = async () => {
    await api.saveSkills(cfg);
    setMsg("已保存技能配置");
  };

  const runTest = async () => {
    if (!testKey) return;
    setTestOut("运行中…");
    try {
      const r = await api.testSkill(testKey, testQ);
      setTestOut(r.output);
    } catch (e: any) {
      setTestOut(`⚠️ ${e.message}`);
    }
  };

  return (
    <div>
      <Card>
        <Section title="技能开关与配置" desc="为 Agent 增加能力：搜索 / 代码 / 文件 / Shell。" />
        {skills.map((s) => (
          <div key={s.key} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
            <label className="inline">
              <input
                type="checkbox"
                checked={!!cfg[s.key]?.enabled}
                onChange={(e) => set(s.key, { enabled: e.target.checked })}
              />
              <b>{s.name}</b>
              <span className="notice">— {s.description}</span>
            </label>
            <div className="row" style={{ marginTop: 8 }}>
              {s.key === "web_search" && (
                <>
                  <div className="col">
                    <Field label="提供方">
                      <select
                        value={cfg[s.key]?.provider ?? "duckduckgo"}
                        onChange={(e) => set(s.key, { provider: e.target.value })}
                      >
                        <option value="duckduckgo">duckduckgo</option>
                        <option value="tavily">tavily</option>
                        <option value="serpapi">serpapi</option>
                      </select>
                    </Field>
                  </div>
                  <div className="col">
                    <Field label="API Key（可选）">
                      <input
                        type="password"
                        value={cfg[s.key]?.api_key ?? ""}
                        onChange={(e) => set(s.key, { api_key: e.target.value })}
                      />
                    </Field>
                  </div>
                </>
              )}
              {(s.key === "code" || s.key === "shell") && (
                <div className="col">
                  <Field label={`超时（秒）：${cfg[s.key]?.timeout ?? 10}`}>
                    <input
                      type="range" min={2} max={60} step={1}
                      value={cfg[s.key]?.timeout ?? 10}
                      onChange={(e) => set(s.key, { timeout: +e.target.value })}
                    />
                  </Field>
                </div>
              )}
              {s.key === "file" && (
                <div className="col">
                  <Field label="沙箱目录">
                    <input
                      type="text"
                      value={cfg[s.key]?.sandbox ?? "data/sandbox"}
                      onChange={(e) => set(s.key, { sandbox: e.target.value })}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="inline" style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={save}>保存技能配置</Button>
          <Notice text={msg} />
        </div>
      </Card>

      <Card>
        <Section title="技能测试台" desc="选择技能并输入参数，直接运行查看结果。" />
        <div className="row">
          <div className="col" style={{ flex: 2 }}>
            <Field label="技能">
              <select value={testKey} onChange={(e) => setTestKey(e.target.value)}>
                {skills.map((s) => (
                  <option key={s.key} value={s.key}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="col" style={{ flex: 4 }}>
            <Field label="输入">
              <input
                type="text"
                value={testQ}
                placeholder="代码：print(1+1)；文件：list；搜索：关键词"
                onChange={(e) => setTestQ(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <Button variant="primary" onClick={runTest}>运行技能</Button>
        <div className="logbox" style={{ marginTop: 12, minHeight: 120 }}>
          {testOut || "（输出显示在这里）"}
        </div>
      </Card>
    </div>
  );
}
