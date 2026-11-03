"""Provider registry + chat model factory (LangChain).

Bring-your-own-key: the key travels with the request and is never stored or logged.
Most providers speak the OpenAI protocol, so one adapter covers many of them.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional

from pydantic import BaseModel, Field


@dataclass(frozen=True)
class ProviderSpec:
    id: str
    label: str
    kind: str  # "openai" | "anthropic" | "google"
    default_model: str
    base_url: Optional[str] = None
    key_env: Optional[str] = None
    needs_key: bool = True
    free_tier: bool = False
    vision: bool = True
    key_url: str = ""
    notes: str = ""


PROVIDERS: dict[str, ProviderSpec] = {
    p.id: p
    for p in [
        ProviderSpec(
            "openrouter", "OpenRouter (modelos gratuitos disponíveis)", "openai",
            default_model=os.environ.get("MOOOSE_OPENROUTER_MODEL", "openrouter/free"),
            base_url="https://openrouter.ai/api/v1", key_env="OPENROUTER_API_KEY",
            free_tier=True, vision=False, key_url="https://openrouter.ai/keys",
            notes="Crie uma conta grátis e use modelos com sufixo ':free'. Transcrição de imagem exige modelo com visão.",
        ),
        ProviderSpec(
            "google", "Google Gemini (camada gratuita no AI Studio)", "google",
            default_model=os.environ.get("MOOOSE_GOOGLE_MODEL", "gemini-2.5-flash"),
            key_env="GOOGLE_API_KEY", free_tier=True, key_url="https://aistudio.google.com/apikey",
            notes="A chave gratuita do AI Studio basta. Na camada gratuita o Google pode usar os dados para melhorar produtos.",
        ),
        ProviderSpec(
            "groq", "Groq (camada gratuita)", "openai",
            default_model=os.environ.get("MOOOSE_GROQ_MODEL", "llama-3.3-70b-versatile"),
            base_url="https://api.groq.com/openai/v1", key_env="GROQ_API_KEY",
            free_tier=True, vision=False, key_url="https://console.groq.com/keys",
        ),
        ProviderSpec(
            "ollama", "Ollama (100% local e grátis)", "openai",
            default_model=os.environ.get("MOOOSE_OLLAMA_MODEL", "qwen2.5:14b"),
            base_url=os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
            needs_key=False, free_tier=True, vision=True, key_url="https://ollama.com/download",
            notes="Roda no seu computador, sem enviar nada para a nuvem.",
        ),
        ProviderSpec(
            "openai", "OpenAI", "openai", default_model=os.environ.get("MOOOSE_OPENAI_MODEL", "gpt-4.1-mini"),
            key_env="OPENAI_API_KEY", key_url="https://platform.openai.com/api-keys",
        ),
        ProviderSpec(
            "anthropic", "Anthropic (Claude)", "anthropic",
            default_model=os.environ.get("MOOOSE_ANTHROPIC_MODEL", "claude-haiku-5-5"),
            key_env="ANTHROPIC_API_KEY", key_url="https://console.anthropic.com/settings/keys",
        ),
        ProviderSpec(
            "custom", "Outro (compatível com OpenAI)", "openai", default_model="",
            key_env="CUSTOM_LLM_API_KEY", needs_key=False, vision=False,
            notes="LM Studio, vLLM, Together, etc. Exige MOOOSE_ALLOW_CUSTOM_BASE_URL=1 no servidor.",
        ),
    ]
}


class LLMConfig(BaseModel):
    provider: str = "openrouter"
    model: Optional[str] = None
    api_key: Optional[str] = Field(default=None, repr=False)
    base_url: Optional[str] = None
    temperature: float = 0.0

    def __repr_args__(self):  # never leak the key in logs
        return [(k, v) for k, v in super().__repr_args__() if k != "api_key"]


def default_vision_model(provider: str) -> Optional[str]:
    """Provider-specific model used for reading photos when the text model can't (local Ollama)."""
    if provider == "ollama":
        return os.environ.get("MOOOSE_OLLAMA_VISION_MODEL", "qwen2.5vl:7b")
    return None


class ProviderError(ValueError):
    pass


def _allow_custom_base_url() -> bool:
    return os.environ.get("MOOOSE_ALLOW_CUSTOM_BASE_URL", "").lower() in {"1", "true", "yes"}


def resolve(cfg: LLMConfig) -> tuple[ProviderSpec, str, Optional[str], Optional[str]]:
    """Returns (spec, model, api_key, base_url) applying env fallbacks."""
    spec = PROVIDERS.get(cfg.provider)
    if spec is None:
        raise ProviderError(f"Provedor desconhecido: {cfg.provider!r}. Opções: {', '.join(PROVIDERS)}")
    model = cfg.model or spec.default_model
    if not model:
        raise ProviderError("Informe o modelo (obrigatório para este provedor).")
    key = cfg.api_key or (os.environ.get(spec.key_env) if spec.key_env else None)
    if spec.needs_key and not key:
        raise ProviderError(
            f"Falta a chave de API para {spec.label}. Crie uma em {spec.key_url or 'o site do provedor'}."
        )
    base_url = spec.base_url
    if cfg.base_url:
        if spec.id not in {"custom", "ollama"} or not _allow_custom_base_url():
            raise ProviderError("base_url personalizada não é permitida neste servidor.")
        base_url = cfg.base_url
    if spec.id == "custom" and not base_url:
        raise ProviderError("O provedor 'custom' exige base_url.")
    return spec, model, key, base_url


def build_chat_model(cfg: LLMConfig):
    """Build a LangChain chat model. Imports are lazy so unused SDKs aren't required."""
    spec, model, key, base_url = resolve(cfg)
    if spec.kind == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(model=model, api_key=key, temperature=cfg.temperature, max_tokens=4096)
    if spec.kind == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(model=model, google_api_key=key, temperature=cfg.temperature)
    from langchain_openai import ChatOpenAI

    kwargs = dict(model=model, api_key=key or "not-needed", temperature=cfg.temperature, max_retries=2, timeout=120)
    if base_url:
        kwargs["base_url"] = base_url
    if spec.id == "openrouter":
        kwargs["default_headers"] = {"HTTP-Referer": "https://github.com/matheussilvano/mooose", "X-Title": "Mooose"}
    return ChatOpenAI(**kwargs)


def public_catalog() -> list[dict]:
    return [
        {
            "id": s.id, "label": s.label, "default_model": s.default_model, "needs_key": s.needs_key,
            "free_tier": s.free_tier, "vision": s.vision, "key_url": s.key_url, "notes": s.notes,
            "server_key_configured": bool(s.key_env and os.environ.get(s.key_env)),
        }
        for s in PROVIDERS.values()
    ]
