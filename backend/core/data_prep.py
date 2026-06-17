"""数据准备：把 CSV / JSON / JSONL 自动转换为 mlx_lm 微调格式（chat messages），
并切分为 train.jsonl / valid.jsonl 输出到 data/processed/。

支持的输入字段（自动识别其一）：
  - messages: [{role, content}, ...]
  - prompt / completion
  - instruction / output（可选 input）
  - question / answer
  - CSV / TSV 两列：第一列为输入，第二列为输出
"""
from __future__ import annotations
import csv
import json
import random
from pathlib import Path

from .. import config

OUT = config.ROOT / "data" / "processed"


class PrepareError(ValueError):
    """数据无法解析为有效训练样本时抛出。"""


def to_pair(row: dict) -> dict | None:
    if "messages" in row and isinstance(row["messages"], list):
        return {"messages": row["messages"]}
    keys = {k.lower(): k for k in row}

    def g(*names):
        for n in names:
            if n in keys:
                return str(row[keys[n]])
        return None

    user = g("prompt", "instruction", "question", "input", "user")
    asst = g("completion", "output", "answer", "response", "assistant")
    instr = g("instruction")
    extra = g("input")
    if instr and extra and asst:
        user = f"{instr}\n{extra}"
    if user and asst:
        return {"messages": [
            {"role": "user", "content": user},
            {"role": "assistant", "content": asst},
        ]}
    return None


def load_rows(path: Path):
    suffix = path.suffix.lower()
    if suffix in (".jsonl", ".ndjson"):
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                yield json.loads(line)
    elif suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        for r in (data if isinstance(data, list) else [data]):
            yield r
    elif suffix in (".csv", ".tsv"):
        delim = "\t" if suffix == ".tsv" else ","
        rows = list(csv.reader(path.open(encoding="utf-8"), delimiter=delim))
        if not rows:
            return
        header = rows[0]
        looks_header = any(h.lower() in ("prompt", "instruction", "question", "input",
                                         "completion", "output", "answer", "response")
                           for h in header)
        if looks_header:
            for r in rows[1:]:
                yield dict(zip(header, r))
        else:
            for r in rows:
                if len(r) >= 2:
                    yield {"prompt": r[0], "completion": r[1]}
    else:
        raise PrepareError(f"不支持的文件类型：{suffix}")


def prepare(in_path: str, val_ratio: float = 0.1) -> tuple[int, int]:
    """转换并切分数据，返回 (训练条数, 验证条数)。失败抛 PrepareError。"""
    path = Path(in_path)
    pairs = [p for row in load_rows(path) if (p := to_pair(row))]
    if not pairs:
        raise PrepareError(
            "未解析到有效样本，请检查字段（prompt/completion、instruction/output、messages 等）。")

    random.seed(42)
    random.shuffle(pairs)
    n_val = max(1, int(len(pairs) * val_ratio)) if len(pairs) > 10 else max(1, len(pairs) // 10)
    valid, train = pairs[:n_val], pairs[n_val:] or pairs

    OUT.mkdir(parents=True, exist_ok=True)
    for name, rows in (("train", train), ("valid", valid)):
        with open(OUT / f"{name}.jsonl", "w", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return len(train), len(valid)
