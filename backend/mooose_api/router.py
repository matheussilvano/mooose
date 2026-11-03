"""Stateless, no-database grading API (bring your own LLM key)."""
from __future__ import annotations

import json
import logging
import os
import time
from collections import defaultdict, deque

import httpx
from fastapi import APIRouter, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from mooose_ai import GradingError, LLMConfig, ProviderError, build_chat_model, grade_essay, public_catalog, stream_grade
from mooose_ai.ocr import IMAGE_TYPES, OCRError, extract_pdf_text, paddle_available, paddle_transcribe, transcribe_image
from mooose_ai.providers import default_vision_model, resolve

logger = logging.getLogger("mooose.api")
router = APIRouter(prefix="/v1", tags=["open grading (BYOK)"])

_hits: dict[str, deque] = defaultdict(deque)


def _rate_limit(request: Request) -> None:
    limit = int(os.environ.get("MOOOSE_RATE_LIMIT_PER_MIN", "20"))
    if limit <= 0:
        return
    ip = request.client.host if request.client else "unknown"
    q, now = _hits[ip], time.time()
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "Muitas requisições. Tente novamente em instantes.")
    q.append(now)


class GradeRequest(BaseModel):
    texto: str
    tema: str
    samples: int = Field(default=1, ge=1, le=5, description="Amostras por competência (mediana = mais estável)")
    review: bool = True


def _llm(provider, model, api_key, base_url):
    cfg = LLMConfig(provider=(provider or os.environ.get("MOOOSE_DEFAULT_PROVIDER", "openrouter")).lower(),
                    model=model, api_key=api_key, base_url=base_url)
    try:
        spec, resolved_model, _, _ = resolve(cfg)
        return build_chat_model(cfg), f"{spec.id}/{resolved_model}"
    except ProviderError as e:
        raise HTTPException(400, str(e)) from e
    except ImportError as e:
        raise HTTPException(501, f"Dependência do provedor ausente no servidor: {e.name}") from e


def _fail(e: Exception):
    if isinstance(e, GradingError | OCRError):
        raise HTTPException(400, str(e))
    logger.error("grading failed: %s", type(e).__name__)  # never log payloads/keys
    raise HTTPException(502, f"Falha ao chamar o provedor de IA ({type(e).__name__}). Verifique chave, modelo e limites da conta.")


@router.get("/providers")
async def providers():
    """Catalog shown in the UI: which providers exist, which are free, which need a key."""
    return public_catalog()


@router.get("/providers/openrouter/free-models")
async def openrouter_free_models():
    """Live list of free OpenRouter models (ids change often, so we don't hard-code them)."""
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            data = (await c.get("https://openrouter.ai/api/v1/models")).json().get("data", [])
    except Exception:
        raise HTTPException(502, "Não foi possível consultar o OpenRouter agora.") from None
    def is_text_model(m: dict) -> bool:
        return (m.get("architecture", {}).get("output_modalities") or ["text"]) == ["text"]

    free = [
        {"id": m["id"], "name": m.get("name", m["id"]), "context_length": m.get("context_length"),
         "vision": "image" in (m.get("architecture", {}).get("input_modalities") or [])}
        for m in data
        if is_text_model(m)
        and str(m.get("pricing", {}).get("prompt", "1")) in {"0", "0.0"}
        and str(m.get("pricing", {}).get("completion", "1")) in {"0", "0.0"}
    ]
    return sorted(free, key=lambda m: -(m["context_length"] or 0))


@router.get("/ocr/engines")
async def ocr_engines():
    return {"paddle": paddle_available(), "vision": True}


@router.post("/ocr")
async def ocr(
    request: Request, arquivo: UploadFile = File(...), engine: str = Form("vision"),
    x_llm_provider: str | None = Header(None), x_llm_model: str | None = Header(None),
    x_llm_api_key: str | None = Header(None), x_llm_base_url: str | None = Header(None),
):
    """Transcribe a photo/PDF to text so the student can review it before grading.
    engine=paddle: local PaddleOCR (no key needed). engine=vision: the selected LLM must support images."""
    _rate_limit(request)
    ctype = (arquivo.content_type or "").lower()
    try:
        data = await arquivo.read()
        if ctype == "application/pdf":
            return {"texto": extract_pdf_text(data), "engine": "pdf"}
        if ctype not in IMAGE_TYPES:
            raise HTTPException(400, "Tipo de arquivo não suportado. Use jpeg/png ou pdf.")
        if engine == "paddle":
            return {"texto": await paddle_transcribe(data), "engine": "paddle"}
        vmodel = x_llm_model or default_vision_model((x_llm_provider or "").lower())
        if (x_llm_provider or "").lower() == "ollama":
            vmodel = default_vision_model("ollama")  # text models like qwen2.5 can't read images
        llm, _ = _llm(x_llm_provider, vmodel, x_llm_api_key, x_llm_base_url)
        return {"texto": await transcribe_image(llm, data, ctype), "engine": "vision"}
    except HTTPException:
        raise
    except Exception as e:
        _fail(e)


@router.post("/grade")
async def grade(
    body: GradeRequest, request: Request,
    x_llm_provider: str | None = Header(None), x_llm_model: str | None = Header(None),
    x_llm_api_key: str | None = Header(None), x_llm_base_url: str | None = Header(None),
):
    _rate_limit(request)
    llm, label = _llm(x_llm_provider, x_llm_model, x_llm_api_key, x_llm_base_url)
    try:
        res = await grade_essay(llm, body.tema, body.texto, samples=body.samples, review=body.review, label=label)
    except Exception as e:
        _fail(e)
    return res.model_dump()


@router.post("/grade/stream")
async def grade_stream(
    body: GradeRequest, request: Request,
    x_llm_provider: str | None = Header(None), x_llm_model: str | None = Header(None),
    x_llm_api_key: str | None = Header(None), x_llm_base_url: str | None = Header(None),
):
    """Server-Sent Events: `progress` per pipeline step, then `result` (or `error`)."""
    _rate_limit(request)
    llm, label = _llm(x_llm_provider, x_llm_model, x_llm_api_key, x_llm_base_url)

    async def events():
        try:
            async for kind, payload in stream_grade(llm, body.tema, body.texto, samples=body.samples, review=body.review, label=label):
                data = payload if kind == "progress" else payload.model_dump()
                yield f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
        except Exception as e:
            msg = str(e) if isinstance(e, GradingError) else f"Falha ao chamar o provedor de IA ({type(e).__name__})."
            yield f"event: error\ndata: {json.dumps(msg, ensure_ascii=False)}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


@router.post("/grade/file")
async def grade_file(
    request: Request, arquivo: UploadFile = File(...), tema: str = Form(...), samples: int = Form(1), ocr_engine: str = Form("vision"),
    x_llm_provider: str | None = Header(None), x_llm_model: str | None = Header(None),
    x_llm_api_key: str | None = Header(None), x_llm_base_url: str | None = Header(None),
    x_llm_vision_model: str | None = Header(None),
):
    """Image (jpeg/png) or PDF. Images need a vision-capable model (X-LLM-Vision-Model overrides)."""
    _rate_limit(request)
    llm, label = _llm(x_llm_provider, x_llm_model, x_llm_api_key, x_llm_base_url)
    ctype = (arquivo.content_type or "").lower()
    try:
        data = await arquivo.read()
        if ctype in IMAGE_TYPES:
            if ocr_engine == "paddle":
                text = await paddle_transcribe(data)
            else:
                vmodel = x_llm_vision_model or default_vision_model((x_llm_provider or "").lower())
                vision = llm if not vmodel else _llm(x_llm_provider, vmodel, x_llm_api_key, x_llm_base_url)[0]
                text = await transcribe_image(vision, data, ctype)
        elif ctype == "application/pdf":
            text = extract_pdf_text(data)
        else:
            raise HTTPException(400, "Tipo de arquivo não suportado. Use jpeg/png ou pdf.")
        res = await grade_essay(llm, tema, text, samples=min(max(samples, 1), 5), label=label)
    except HTTPException:
        raise
    except Exception as e:
        _fail(e)
    out = res.model_dump()
    out["texto_transcrito"] = text
    return out
