// 后端 REST 接口封装。所有路径以 /api 开头，由 Vite 代理到 :8000。

export type WSType = "log" | "progress" | "agent_step" | "done" | "error";
export interface WSMessage {
  type: WSType;
  task_id: string;
  payload: Record<string, any>;
}

export interface AgentSpec {
  key: string;
  name: string;
  enabled: boolean;
  system_prompt: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function http<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

const get = <T,>(u: string) => http<T>(u);
const post = <T,>(u: string, body?: any) =>
  http<T>(u, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const put = <T,>(u: string, body?: any) =>
  http<T>(u, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
const del = <T,>(u: string) => http<T>(u, { method: "DELETE" });

export const api = {
  health: () => get<any>("/api/health"),

  // Agents
  dispatch: (request: string, mode: "orchestrate" | "single", agent_key?: string) =>
    post<{ task_id: string }>("/api/dispatch", { request, mode, agent_key }),
  listAgents: () => get<{ agents: AgentSpec[]; orchestrator_prompt: string }>("/api/agents"),
  saveAgent: (a: AgentSpec) => put<any>(`/api/agents/${a.key}`, a),
  deleteAgent: (key: string) => del<any>(`/api/agents/${key}`),
  saveOrchestrator: (prompt: string) => put<any>("/api/orchestrator", { prompt }),

  // LLM
  llmModels: () => get<any>("/api/llm/models"),
  llmConfig: (cfg: Record<string, any>) => put<any>("/api/llm/config", cfg),
  llmProvider: () => get<any>("/api/llm/provider"),
  saveProvider: (cfg: Record<string, any>) => put<any>("/api/llm/provider", cfg),
  llmPrepare: (filename: string, val_ratio = 0.1) =>
    post<any>("/api/llm/prepare", { filename, val_ratio }),
  llmTrain: (preset: string, iters?: number) =>
    post<{ task_id: string }>("/api/llm/train", { preset, iters }),
  llmStop: () => post<any>("/api/llm/stop"),
  llmChat: (messages: ChatMessage[], use_adapter: boolean, compare = false) =>
    post<any>("/api/llm/chat", { messages, use_adapter, compare }),

  // YOLO
  yoloModels: () => get<any>("/api/yolo/models"),
  yoloTrain: (body: Record<string, any>) =>
    post<{ task_id: string }>("/api/yolo/train", body),

  // Skills
  listSkills: () => get<any>("/api/skills"),
  saveSkills: (skills: Record<string, any>) => put<any>("/api/skills", skills),
  testSkill: (key: string, query: string) =>
    post<{ output: string }>(`/api/skills/${key}/test`, { query }),

  // MCP
  listMcp: () => get<any>("/api/mcp/servers"),
  addMcp: (server: Record<string, any>) => post<any>("/api/mcp/servers", server),
  deleteMcp: (name: string) => del<any>(`/api/mcp/servers/${name}`),
  testMcp: (name: string) => post<{ result: string }>(`/api/mcp/servers/${name}/test`),

  // Files
  listFiles: () => get<{ files: { name: string; size: number }[] }>("/api/files"),
  deleteFile: (name: string) => del<any>(`/api/files/${name}`),

  // History（SQLite 固化数据查询）
  histTasks: (kind?: string, limit = 200) =>
    get<any>(`/api/history/tasks?limit=${limit}${kind ? `&kind=${kind}` : ""}`),
  histTask: (id: string) => get<any>(`/api/history/tasks/${id}`),
  histOperations: (method?: string, q?: string, limit = 200) => {
    const p = new URLSearchParams({ limit: String(limit) });
    if (method) p.set("method", method);
    if (q) p.set("q", q);
    return get<any>(`/api/history/operations?${p.toString()}`);
  },
  histConfig: () => get<any>("/api/history/config"),
};

// 文件上传（multipart）
export async function uploadFile(url: string, file: File, extra?: Record<string, string>) {
  const fd = new FormData();
  fd.append("file", file);
  for (const [k, v] of Object.entries(extra || {})) fd.append(k, v);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}
