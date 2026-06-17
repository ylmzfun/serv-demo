# MLX-Agent-Train

> 基于 Apple MLX 的一站式平台：**多 Agent 调度 · 开源大模型微调 · YOLO 模型训练**，并支持 **Skill** 与 **MCP** 扩展。
> 全部能力通过 Web 页面操作，**不碰配置文件**。

面向本地 / Apple Silicon 的端到端「调度 → 微调 → 测试」工作流。

---

## 📑 目录

- [MLX-Agent-Train](#mlx-agent-train)
  - [📑 目录](#-目录)
  - [🧱 技术栈](#-技术栈)
  - [📂 项目结构](#-项目结构)
  - [🚀 快速开始](#-快速开始)
  - [✨ 功能总览](#-功能总览)
    - [🤖 多 Agent 调度](#-多-agent-调度)
    - [🧠 大模型微调](#-大模型微调)
    - [🧩 YOLO 模型训练](#-yolo-模型训练)
    - [🔌 扩展能力](#-扩展能力)
  - [🧭 架构（主控分发）](#-架构主控分发)
  - [🗂 数据格式](#-数据格式)
  - [🔌 API 约定](#-api-约定)
  - [🛠 微调全流程（全在 Web 内）](#-微调全流程全在-web-内)

---

## 🧱 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | React 18 + Vite + TypeScript | 多页签 Web UI |
| 前端通信 | REST (fetch) + WebSocket | WebSocket 接收实时训练日志 |
| 后端 | Python 3.11 + FastAPI + Uvicorn | REST API + WebSocket 服务 |
| LLM 微调 | `mlx-lm`（LoRA / 全量） | Apple MLX 后端 |
| 对话推理 | DeepSeek API / 本地 MLX | Agent 与对话**优先 DeepSeek**，未配置时回退本地 MLX |
| 视觉训练 | `ultralytics`（YOLO） | 目标检测训练 / 推理 |
| Agent 编排 | 自研 Orchestrator（Python） | 规划 / 执行 / 审查流水线 |
| 任务管理 | `asyncio` 后台任务 + 内存任务表 | 单机运行，无需外部队列 |
| 数据存储 | 本地文件系统（`data/`、`models/`） | 训练数据与权重落盘 |

> 运行环境：**macOS + Apple Silicon (M 系列)**，依赖 MLX 故不支持 Intel / Windows / Linux GPU。

---

## 📂 项目结构

```
mlx-agent-train/
├── backend/
│   ├── main.py                 # FastAPI 入口，挂载路由 & WebSocket
│   ├── config.py               # 路径、端口、默认超参（唯一配置来源）
│   ├── api/
│   │   ├── agents.py           # Agent 调度 & 管理路由
│   │   ├── llm.py              # 模型切换 / 微调 / 对话路由
│   │   ├── yolo.py            # YOLO 微调 / 物体识别路由
│   │   ├── skills.py          # Skill 开关 & 测试台路由
│   │   ├── mcp.py             # MCP 服务器管理路由
│   │   └── files.py           # 训练文件 & 数据上传路由
│   ├── core/
│   │   ├── orchestrator.py    # 总控：拆解需求 → 分发子 Agent
│   │   ├── agent.py           # 单个 Agent（planner/executor/reviewer）
│   │   ├── engine.py          # MLX 模型引擎：单例加载 + 缓存推理（优雅降级）
│   │   ├── data_prep.py       # 数据转换：CSV/JSON/JSONL → train/valid.jsonl
│   │   ├── trainer_llm.py     # mlx-lm LoRA 微调封装（子进程 + 日志广播）
│   │   ├── trainer_yolo.py    # ultralytics 训练 / 推理封装
│   │   ├── skills/            # 内置 Skill（code/file/shell/search）
│   │   └── mcp_client.py      # MCP stdio/http 客户端
│   ├── tasks.py               # 后台任务表 + 日志广播（TaskHub）
│   ├── schemas.py             # Pydantic 请求/响应模型
│   ├── pyproject.toml          # 后端依赖（fastapi / mlx-lm / ultralytics 等）
│   ├── data/                   # 上传的训练数据（CSV/JSON/JSONL）
│   ├── models/                 # 基础模型与微调产物
│   │   ├── llm/                # LoRA 适配器 / 融合权重
│   │   └── yolo/               # YOLO 训练输出
│   ├── logs/                   # 运行日志
│   └── config/                 # runtime_config.json（运行时生成，界面维护）
├── frontend/
│   ├── src/
│   │   ├── pages/             # 每个功能页一个组件（见下方功能总览）
│   │   ├── components/        # 复用组件（日志面板、对比视图等）
│   │   ├── api/               # 后端接口封装
│   │   └── App.tsx            # 路由 & 页签布局
│   ├── index.html
│   └── vite.config.ts
└── README.md
```

> 数据、模型、日志、运行时配置全部位于 `backend/` 之下，项目根目录只保留 `backend/` 与 `frontend/` 两个目录。

---

## 🚀 快速开始

后端依赖与虚拟环境都放在 `backend/` 内（使用 [uv](https://github.com/astral-sh/uv)）。

```bash
# 1. 后端（FastAPI，http://127.0.0.1:8000）
cd backend
uv venv                       # 创建 backend/.venv
uv pip install -e .           # 安装依赖（fastapi / mlx-lm / ultralytics 等）
uvicorn main:app --reload --port 8000
# 启动后访问 http://localhost:8000/docs 可直接调试全部 API

# 2. 前端（另开一个终端，http://localhost:5173）
cd frontend
npm install
npm run dev
```

也可从项目根目录启动后端（无需进入 backend/）：

```bash
uvicorn backend.main:app --reload --port 8000
```

前端开发服务器通过 Vite 代理把 `/api` 与 `/ws` 转发到后端 `:8000`。

---

## ✨ 功能总览

全部能力都通过 Web 页面操作，按四大模块组织。下表中「页签」对应 `frontend/src/pages/` 下的一个组件。

### 🤖 多 Agent 调度
输入一句需求，总控自动拆解为 `规划 → 执行 → 审查` 流水线，每个 Agent 由你微调的模型驱动。

| 页签 | 组件 | 功能 | 状态 |
|------|------|------|------|
| 🎯 Agent 调度 | `Dispatch.tsx` | 输入需求，总控自动拆解 → 规划 / 执行 / 审查子 Agent 流水线处理 | ✅ 可用 |
| 👥 Agent 管理 | `Agents.tsx` | 在页面内编辑每个 Agent 的角色和提示词，可使用deepsee&qwen等大模型api或微调后的模型 | ✅ 可用 |

### 🧠 大模型微调
上传数据，一键准备 / 训练，实时对比基础模型与微调模型。

| 页签 | 组件 | 功能 | 状态 |
|------|------|------|------|
| 🧠 模型 & 微调 | `LlmTrain.tsx` | 切换模型 / 一键微调（LoRA） | ✅ 可用 |
| 💬 对话 | `Chat.tsx` | 与微调模型实时对话，左右对比基础模型 vs 微调模型 | ✅ 可用 |
| 📁 训练文件 & 数据 | `Files.tsx` | 上传 / 管理训练数据（CSV / JSON / JSONL） | ✅ 可用 |
| 📋 日志 | `Logs.tsx` | 系统运行日志，WebSocket 实时显示训练进度 | ✅ 可用 |

### 🧩 YOLO 模型训练
切换模型版本、一键微调、Web 内直接做物体识别测试。

| 页签 | 组件 | 功能 | 状态 |
|------|------|------|------|
| 🧩 YOLO 模型 & 微调 | `YoloTrain.tsx` | 切换模型版本（v8/v11 等）/ 一键微调 | ✅ 可用 |
| 🔍 物体识别测试 | `YoloDetect.tsx` | 上传图片，Web 内直接验证识别效果 | ✅ 可用 |

### 🔌 扩展能力
Skill 与 MCP 即插即用。

| 页签 | 组件 | 功能 | 状态 |
|------|------|------|------|
| 🛠 Skill | `Skills.tsx` | 技能开关 + 实时测试台 | ✅ 代码 / 文件 / Shell 已接通，搜索框架就绪 |
| 🔌 MCP | `Mcp.tsx` | 添加 stdio / http 服务器 | 🔧 框架就绪，逐个接通 |

---

## 🧭 架构（主控分发）

```
                    ┌────────────────────┐
   用户需求  ──────► │  总控 Orchestrator  │
                    └─────────┬──────────┘
                              │ 拆解 & 分发
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐     ┌─────────┐     ┌─────────┐
        │ 规划师   │ ──► │ 执行者   │ ──► │ 审查员   │
        │ planner │     │ executor│     │ reviewer│
        └─────────┘     └────┬────┘     └─────────┘
                             │ 可调用
                    ┌────────┴────────┐
                    ▼                 ▼
                 Skill 库          MCP 服务器
              (搜索/代码/         (stdio/http)
               文件/Shell)
                             │
                             ▼
                      汇总 → 最终答复
```

- 每个 Agent 都由**你微调的模型**驱动。
- 调度链路通过 WebSocket 在前端实时展示（每个子 Agent 的输入/输出逐步推送）。
- 角色与提示词在 `👥 Agent 管理` 页内编辑，存于后端 `core/agent.py` 读取的配置中。

---

## 🗂 数据格式

LLM 微调数据支持三种格式，统一转换为 `{"prompt", "completion"}` 训练样本：

```jsonl
{"prompt": "把这句翻译成英文：你好", "completion": "Hello"}
{"prompt": "1+1=?", "completion": "2"}
```

| 格式 | 要求 |
|------|------|
| `.jsonl` | 每行一个 JSON 对象，含 `prompt` 与 `completion` 字段 |
| `.json` | 顶层为对象数组，元素含 `prompt` / `completion` |
| `.csv` | 含 `prompt`、`completion` 两列（首行为表头） |

YOLO 训练数据遵循 Ultralytics 目录约定（`images/`、`labels/` + `data.yaml`）。

---

## 🔌 API 约定

REST 前缀 `/api`，实时日志走 WebSocket `/ws/logs`。所有训练类接口立即返回 `task_id`，进度通过 WebSocket 推送。

| 方法 & 路径 | 说明 |
|-------------|------|
| `POST /api/dispatch` | 提交需求，启动 Agent 流水线，返回 `task_id` |
| `GET  /api/agents` / `PUT /api/agents/{role}` | 读取 / 编辑 Agent 角色与提示词 |
| `GET  /api/llm/models` | 列出可用基础模型与微调产物 |
| `POST /api/llm/prepare` | 预处理上传的数据集 |
| `POST /api/llm/train` | 开始微调，返回 `task_id` |
| `POST /api/llm/stop` | 停止当前训练任务 |
| `POST /api/llm/chat` | 对话；`compare=true` 时同时返回基础 vs 微调输出 |
| `GET  /api/yolo/models` / `POST /api/yolo/train` | YOLO 模型列表 / 微调 |
| `POST /api/yolo/detect` | 上传图片，返回检测框结果 |
| `GET  /api/skills` / `POST /api/skills/{name}/test` | Skill 开关 / 测试台执行 |
| `GET/POST/DELETE /api/mcp/servers` | MCP 服务器增删查 |
| `POST /api/files/upload` / `GET /api/files` | 上传 / 列出训练数据 |
| `WS   /ws/logs` | 推送系统日志、训练进度、Agent 调度链路 |

WebSocket 消息统一为：

```json
{ "type": "log | progress | agent_step | done | error", "task_id": "...", "payload": { } }
```

---

## 🛠 微调全流程（全在 Web 内）

1. **📁 文件 & 数据** —— 上传你的 CSV / JSON / JSONL
2. **🧠 模型 & 微调 → 开始微调** —— 点「准备数据」→ 选配置 → 点「开始训练」
3. **📋 日志** —— WebSocket 实时显示进度，可随时「停止」
4. **💬 对话** —— 输入问题，左右对比基础模型 vs 微调模型
