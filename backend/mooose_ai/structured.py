"""Provider-agnostic structured output: JSON in the prompt, Pydantic validation, one repair retry.

Native tool-calling/structured-output is flaky on many free/local models, so we rely on
plain-text JSON which every chat model can produce, and repair on failure."""
from __future__ import annotations

import json
import re
from typing import Type, TypeVar

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


class StructuredOutputError(RuntimeError):
    pass


def extract_json(text: str) -> object:
    """Find the first balanced JSON object in model output (handles ```json fences and chatter)."""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.I)
    start = text.find("{")
    if start == -1:
        raise ValueError("no JSON object found")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : i + 1])
    raise ValueError("unterminated JSON object")


def _content_to_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # content blocks (Anthropic / Gemini)
        return "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in content)
    return str(content)


async def ainvoke_structured(llm, system: str, user: str, schema: Type[T], retries: int = 1) -> T:
    schema_hint = json.dumps(schema.model_json_schema(), ensure_ascii=False)
    messages = [
        SystemMessage(content=f"{system}\n\nResponda SOMENTE com um objeto JSON válido que siga este JSON Schema:\n{schema_hint}"),
        HumanMessage(content=user),
    ]
    last_err: Exception | None = None
    for _ in range(retries + 1):
        reply = await llm.ainvoke(messages)
        raw = _content_to_text(reply.content)
        try:
            return schema.model_validate(extract_json(raw))
        except (ValueError, ValidationError) as err:
            last_err = err
            messages = messages + [
                reply,
                HumanMessage(content=f"Sua resposta não é válida ({str(err)[:400]}). Responda novamente apenas com o JSON corrigido."),
            ]
    raise StructuredOutputError(f"O modelo não retornou JSON válido para {schema.__name__}: {last_err}")
