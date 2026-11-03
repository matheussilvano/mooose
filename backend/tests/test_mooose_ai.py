"""Pipeline tests with a scripted fake LLM: no network, no API keys."""
import json

import pytest
from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from mooose_ai import calibration as cal
from mooose_ai import grade_essay
from mooose_ai.providers import LLMConfig, ProviderError, resolve
from mooose_ai.schemas import InterventionGrade
from mooose_ai.structured import extract_json

ESSAY = "Palavra " * 120


class RouterLLM:
    """Answers according to which task the system prompt describes."""

    def __init__(self, adequacao="plena", scores=None, audit=None, dissertativo=True):
        self.adequacao, self.dissertativo = adequacao, dissertativo
        self.scores = scores or {1: 160, 2: 160, 3: 160, 4: 160}
        self.audit = audit or []
        self.calls = 0

    async def ainvoke(self, messages):
        self.calls += 1
        sys = messages[0].content
        if "classificar a adequação" in sys:
            body = {"adequacao": self.adequacao, "dissertativo_argumentativo": self.dissertativo, "tese": "t", "justificativa": "j"}
        elif "Competência 5 — Proposta" in sys:
            body = {"agente": True, "acao": True, "meio_modo": True, "finalidade": True, "detalhamento": "aprofundado",
                    "articulada_ao_problema": True, "evidencias": ["x"], "feedback": "ok c5"}
        elif "revisor sênior" in sys:
            body = {"adjustments": self.audit, "observacao": "obs"}
        elif "analise_geral" in sys:
            body = {"analise_geral": "**Resumo geral:** ok", "proximos_passos": ["a", "b", "c"]}
        else:
            cid = int(sys.split("Competência ")[1].split(" ")[0])
            body = {"nota": self.scores[cid], "evidencias": ["trecho"], "feedback": f"fb{cid}"}
        return AIMessage(content="```json\n" + json.dumps(body) + "\n```")


def test_snap_ties_go_down_and_clamp():
    assert cal.snap_score(100) == 80
    assert cal.snap_score(150) == 160
    assert cal.snap_score(999) == 200
    assert cal.snap_score("x") == 0


def test_intervention_scoring():
    full = InterventionGrade(agente=True, acao=True, meio_modo=True, finalidade=True, detalhamento="aprofundado", feedback="")
    assert cal.score_intervention(full) == 200
    assert cal.score_intervention(full.model_copy(update={"detalhamento": "simples"})) == 160
    assert cal.score_intervention(full.model_copy(update={"detalhamento": "vago"})) == 120
    none = InterventionGrade(agente=False, acao=False, meio_modo=False, finalidade=False, detalhamento="ausente", feedback="")
    assert cal.score_intervention(none) == 0


def test_tangency_caps():
    out = cal.apply_tangency_caps({1: 200, 2: 200, 3: 200, 4: 200, 5: 200}, "tangenciamento_grave")
    assert out[2] == 80 and out[3] == 120 and sum(out.values()) <= 640


def test_audit_is_bounded_to_one_level():
    assert cal.apply_audit({1: 160}, [(1, 40)])[1] == 120
    assert cal.apply_audit({1: 160}, [(1, 200)])[1] == 200


def test_extract_json_handles_fences_and_chatter():
    assert extract_json('Claro!\n```json\n{"a": "}"}\n``` fim') == {"a": "}"}


@pytest.mark.asyncio
async def test_full_pipeline():
    res = await grade_essay(RouterLLM(), "Tema X", ESSAY, label="fake/fake")
    assert res.nota_final == 160 * 4 + 200
    assert [c.id for c in res.competencias] == [1, 2, 3, 4, 5]
    assert res.meta["model"] == "fake/fake" and res.anulada is None


@pytest.mark.asyncio
async def test_fuga_total_is_annulled():
    res = await grade_essay(RouterLLM(adequacao="fuga_total"), "Tema X", ESSAY)
    assert res.nota_final == 0 and "Fuga total" in res.anulada


@pytest.mark.asyncio
async def test_short_text_is_annulled():
    res = await grade_essay(RouterLLM(), "Tema X", "texto curto demais")
    assert res.nota_final == 0


@pytest.mark.asyncio
async def test_audit_adjustment_applied():
    res = await grade_essay(RouterLLM(audit=[{"id": 1, "nota_sugerida": 200, "motivo": "m"}]), "T", ESSAY)
    assert res.competencias[0].nota == 200


@pytest.mark.asyncio
async def test_samples_multiply_calls():
    llm = RouterLLM()
    await grade_essay(llm, "T", ESSAY, samples=3)
    assert llm.calls == 1 + 5 * 3 + 1 + 1


@pytest.mark.asyncio
async def test_invalid_json_is_repaired_once():
    replies = iter([AIMessage(content="não sei"), AIMessage(content='{"adequacao":"plena","dissertativo_argumentativo":true}')])

    class Flaky:
        async def ainvoke(self, m):
            return next(replies)

    from mooose_ai.schemas import ThemeAnalysis
    from mooose_ai.structured import ainvoke_structured
    ta = await ainvoke_structured(Flaky(), "s", "u", ThemeAnalysis)
    assert ta.adequacao == "plena"


def test_provider_resolution(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(ProviderError):
        resolve(LLMConfig(provider="openrouter"))
    spec, model, key, base = resolve(LLMConfig(provider="openrouter", api_key="k"))
    assert key == "k" and "openrouter.ai" in base
    resolve(LLMConfig(provider="ollama"))  # no key needed
    with pytest.raises(ProviderError):
        resolve(LLMConfig(provider="openai", api_key="k", base_url="http://169.254.169.254"))
    assert "k" not in repr(LLMConfig(provider="openai", api_key="secret-k")).replace("openai", "")


def test_api_requires_key_and_lists_providers():
    from mooose_api.app import app

    c = TestClient(app)
    ids = [p["id"] for p in c.get("/v1/providers").json()]
    assert "openrouter" in ids and "ollama" in ids
    r = c.post("/v1/grade", json={"texto": ESSAY, "tema": "T"}, headers={"x-llm-provider": "openai"})
    assert r.status_code == 400


def test_ocr_engines_endpoint():
    from mooose_api.app import app

    r = TestClient(app).get("/v1/ocr/engines")
    assert r.status_code == 200 and r.json()["vision"] is True
