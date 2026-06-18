"""Pydantic 请求 / 响应模型。"""
from __future__ import annotations
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ----------------------------- Agent -----------------------------
class DispatchRequest(BaseModel):
    request: str = Field(..., description="用户需求")
    mode: Literal["orchestrate", "single"] = "orchestrate"
    agent_key: Optional[str] = None  # mode=single 时指定


class AgentSpec(BaseModel):
    key: str
    name: str
    enabled: bool = True
    system_prompt: str = ""


class OrchestratorPrompt(BaseModel):
    prompt: str


# ----------------------------- LLM -----------------------------
class ModelConfig(BaseModel):
    base_id: Optional[str] = None
    adapter_path: Optional[str] = None
    use_adapter: Optional[bool] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    lora_rank: Optional[int] = None
    lora_scale: Optional[float] = None
    lora_layers: Optional[int] = None


class PrepareRequest(BaseModel):
    filename: str
    val_ratio: float = 0.1


class TrainRequest(BaseModel):
    preset: Literal["lite", "standard", "hq"] = "standard"
    iters: Optional[int] = None


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    use_adapter: bool = False
    compare: bool = False  # True 时同时返回基础 vs 微调输出


class ProviderConfig(BaseModel):
    """对话提供方设置（优先 DeepSeek API，回退本地 MLX）。"""
    active: Optional[Literal["auto", "deepseek", "mlx"]] = None
    deepseek_enabled: Optional[bool] = None
    deepseek_api_key: Optional[str] = None
    deepseek_base_url: Optional[str] = None
    deepseek_model: Optional[str] = None


class MediaProviderConfig(BaseModel):
    """媒体提供方设置：cap 为 image / video，vendor 为 ark / openai / local。"""
    cap: Literal["image", "video"]
    active: Optional[Literal["auto", "ark", "openai", "local"]] = None
    vendor: Optional[Literal["ark", "openai", "local"]] = None
    enabled: Optional[bool] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


# ----------------------------- YOLO -----------------------------
class YoloTrainRequest(BaseModel):
    base_model: str = "yolo11n.pt"
    data_yaml: str = Field(..., description="data.yaml 的相对路径（位于 data/ 下）")
    epochs: int = 50
    imgsz: int = 640
    batch: int = 16


# ----------------------------- Skill / MCP -----------------------------
class SkillTestRequest(BaseModel):
    query: str = ""


class McpServer(BaseModel):
    name: str
    type: Literal["stdio", "http"] = "stdio"
    command: str = ""
    args: list[str] = Field(default_factory=list)
    url: str = ""
    enabled: bool = True


# ----------------------------- 通用响应 -----------------------------
class TaskResponse(BaseModel):
    task_id: str
    state: str = "running"
    message: str = ""


class WSMessage(BaseModel):
    type: Literal["log", "progress", "agent_step", "done", "error"]
    task_id: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)
