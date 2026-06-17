"""模型切换 / 微调 / 对话路由。"""
from __future__ import annotations
from pathlib import Path

from fastapi import APIRouter, HTTPException

from .. import config
from ..core import data_prep
from ..core import providers
from ..core.engine import Engine
from ..core.trainer_llm import LlmTrainer
from ..schemas import ModelConfig, PrepareRequest, TrainRequest, ChatRequest, ProviderConfig, TaskResponse

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.get("/models")
def list_models():
    cfg = config.load()
    adapters = []
    adir = config.LLM_MODELS_DIR
    if adir.exists():
        adapters = [str(p.relative_to(config.ROOT)) for p in adir.glob("*") if p.is_dir()]
    return {
        "choices": config.LLM_MODEL_CHOICES,
        "presets": {k: v["label"] for k, v in config.LLM_PRESETS.items()},
        "adapters": adapters,
        "current": cfg["model"],
        "lora": cfg["lora"],
        "mlx_available": Engine.instance().available,
    }


@router.put("/config")
def update_config(body: ModelConfig):
    patch: dict = {"model": {}, "lora": {}}
    m = patch["model"]
    if body.base_id is not None:
        m["base_id"] = body.base_id
    if body.adapter_path is not None:
        m["adapter_path"] = body.adapter_path
    if body.use_adapter is not None:
        m["use_adapter"] = body.use_adapter
    if body.temperature is not None:
        m["temperature"] = body.temperature
    if body.max_tokens is not None:
        m["max_tokens"] = body.max_tokens
    if body.lora_rank is not None:
        patch["lora"]["rank"] = body.lora_rank
    if body.lora_scale is not None:
        patch["lora"]["scale"] = body.lora_scale
    if body.lora_layers is not None:
        patch["lora"]["layers"] = body.lora_layers
    cfg = config.update(patch)
    Engine.instance().unload()
    return {"ok": True, "model": cfg["model"], "lora": cfg["lora"]}


@router.post("/prepare")
def prepare(req: PrepareRequest):
    src = Path(config.abspath(f"data/{req.filename}"))
    if not src.exists():
        src = Path(config.abspath(req.filename))
    if not src.exists():
        raise HTTPException(404, f"未找到数据文件：{req.filename}")
    try:
        n_tr, n_va = data_prep.prepare(str(src), val_ratio=req.val_ratio)
    except data_prep.PrepareError as e:
        raise HTTPException(400, str(e))
    return {"ok": True, "train": n_tr, "valid": n_va, "out": "data/processed"}


@router.post("/train", response_model=TaskResponse)
def train(req: TrainRequest):
    tid, msg = LlmTrainer.instance().start(req.preset, req.iters)
    if tid is None:
        raise HTTPException(409, msg)
    return TaskResponse(task_id=tid, message=msg)


@router.post("/stop")
def stop():
    return {"message": LlmTrainer.instance().stop()}


@router.get("/provider")
def get_provider():
    """对话提供方状态：当前选择、实际解析结果、DeepSeek 是否就绪（不回传明文 key）。"""
    return providers.status()


@router.put("/provider")
def set_provider(body: ProviderConfig):
    patch: dict = {"providers": {"deepseek": {}}}
    if body.active is not None:
        patch["providers"]["active"] = body.active
    ds = patch["providers"]["deepseek"]
    if body.deepseek_enabled is not None:
        ds["enabled"] = body.deepseek_enabled
    if body.deepseek_api_key is not None:
        ds["api_key"] = body.deepseek_api_key.strip()
    if body.deepseek_base_url is not None:
        ds["base_url"] = body.deepseek_base_url.strip() or "https://api.deepseek.com"
    if body.deepseek_model is not None:
        ds["model"] = body.deepseek_model.strip() or "deepseek-chat"
    if not ds:
        patch["providers"].pop("deepseek")
    config.update(patch)
    return {"ok": True, **providers.status()}


@router.post("/chat")
def chat(req: ChatRequest):
    eng = Engine.instance()
    msgs = [m.model_dump() for m in req.messages]
    if req.compare:
        # 微调前后对比天然属于本地 MLX（基础 vs LoRA），不走 DeepSeek。
        cfg = config.load()
        base = eng.chat(msgs, adapter="")  # 空串 = 强制基础模型
        adapter_dir = Path(config.abspath(cfg["model"]["adapter_path"]))
        if adapter_dir.exists():
            ft = eng.chat(msgs, adapter=cfg["model"]["adapter_path"])
        else:
            ft = "（未找到微调适配器，请先完成一次训练）"
        return {"base": base, "finetuned": ft}
    # 非对比：优先 DeepSeek，回退 MLX；MLX 时由 use_adapter 决定是否挂微调权重
    adapter = config.load()["model"]["adapter_path"] if req.use_adapter else ""
    reply = providers.chat(msgs, adapter=adapter)
    return {"reply": reply, "provider": providers.active_provider()}
