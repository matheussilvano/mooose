"""LangGraph pipeline.

  analyze_theme ─┬─ grade_c1 ─┐
                 ├─ grade_c2 ─┤
                 ├─ grade_c3 ─┼─> audit ─> finalize ─> synthesize ─> END
                 ├─ grade_c4 ─┤
                 └─ grade_c5 ─┘

* Five specialised graders run in parallel (one rubric each).
* Each can be sampled N times; the median score wins (self-consistency).
* Competency 5 is feature-based: the LLM extracts evidence, code computes the score.
* A second-opinion auditor may nudge scores by at most one level.
* `finalize` is deterministic: snapping, INEP annulment rules, tangency caps.
"""
from __future__ import annotations

import asyncio
import operator
import time
from typing import Annotated, Any, TypedDict

from langgraph.graph import END, START, StateGraph

from . import calibration as cal
from . import rubric
from .schemas import (
    Audit,
    CompetencyGrade,
    CompetencyResult,
    EssayResult,
    InterventionGrade,
    Synthesis,
    ThemeAnalysis,
)
from .structured import ainvoke_structured

MAX_ESSAY_CHARS = 12_000


def _merge(a: dict, b: dict) -> dict:
    return {**a, **b}


class State(TypedDict, total=False):
    theme: str
    essay: str
    samples: int
    review: bool
    llm: Any
    theme_analysis: ThemeAnalysis
    grades: Annotated[dict, _merge]  # id -> {"nota", "feedback", "evidencias"}
    warnings: Annotated[list, operator.add]
    audit: Audit
    scores: dict
    annulled: str | None
    result: EssayResult
    synthesis: Synthesis


async def analyze_theme(state: State) -> dict:
    ta = await ainvoke_structured(
        state["llm"], rubric.THEME_SYSTEM, rubric.user_payload(state["theme"], state["essay"]), ThemeAnalysis
    )
    return {"theme_analysis": ta}


def _grader(cid: int):
    async def node(state: State) -> dict:
        llm, theme, essay = state["llm"], state["theme"], state["essay"]
        n = max(1, state.get("samples", 1))
        ta: ThemeAnalysis = state["theme_analysis"]
        context = f"\n(Contexto: adequação ao tema classificada como {ta.adequacao}; tese: {ta.tese})"
        if cid == 5:
            system = f"{rubric.BASE_SYSTEM}\n\n{rubric.INTERVENTION_RUBRIC}\n\n{rubric.GRADE_FEEDBACK_RULES}"
            runs = await asyncio.gather(
                *[ainvoke_structured(llm, system, rubric.user_payload(theme, essay, context), InterventionGrade) for _ in range(n)]
            )
            scored = [(cal.score_intervention(r), r) for r in runs]
        else:
            name, desc = rubric.COMPETENCIES[cid]
            system = f"{rubric.BASE_SYSTEM}\n\nTAREFA: avaliar SOMENTE a Competência {cid} — {name}.\n{desc}\n\n{rubric.GRADE_FEEDBACK_RULES}"
            runs = await asyncio.gather(
                *[ainvoke_structured(llm, system, rubric.user_payload(theme, essay, context), CompetencyGrade) for _ in range(n)]
            )
            scored = [(cal.snap_score(r.nota), r) for r in runs]
        final = cal.aggregate_samples([s for s, _ in scored])
        # feedback from the sample closest to the winning score
        best = min(scored, key=lambda sr: abs(sr[0] - final))[1]
        spread = max(s for s, _ in scored) - min(s for s, _ in scored)
        out: dict = {"grades": {cid: {"nota": final, "feedback": best.feedback, "evidencias": best.evidencias, "spread": spread}}}
        if spread >= 80:
            out["warnings"] = [f"C{cid}: amostras divergentes (variação de {spread} pontos); considere um modelo mais forte."]
        return out
    return node


async def audit(state: State) -> dict:
    if not state.get("review", True):
        return {"audit": Audit()}
    g = state["grades"]
    summary = "\n\n".join(
        f"C{cid}: nota {g[cid]['nota']}\nEvidências: {g[cid]['evidencias']}\nFeedback: {g[cid]['feedback']}" for cid in sorted(g)
    )
    ta: ThemeAnalysis = state["theme_analysis"]
    extra = f"\n\n<avaliacoes>\nAdequação ao tema: {ta.adequacao}\n{summary}\n</avaliacoes>"
    try:
        a = await ainvoke_structured(state["llm"], rubric.AUDIT_SYSTEM, rubric.user_payload(state["theme"], state["essay"], extra), Audit)
    except Exception:  # the audit is best-effort
        return {"audit": Audit(), "warnings": ["Revisão automática indisponível; notas mantidas."]}
    return {"audit": a}


async def finalize(state: State) -> dict:
    ta: ThemeAnalysis = state["theme_analysis"]
    scores = {cid: state["grades"][cid]["nota"] for cid in range(1, 6)}
    reason = cal.annulment_reason(ta.adequacao, ta.dissertativo_argumentativo, state["essay"])
    if reason:
        return {"scores": {cid: 0 for cid in scores}, "annulled": reason}
    scores = cal.apply_audit(scores, [(a.id, a.nota_sugerida) for a in state["audit"].adjustments])
    scores = cal.apply_tangency_caps(scores, ta.adequacao)
    return {"scores": scores, "annulled": None}


async def synthesize(state: State) -> dict:
    scores, ta = state["scores"], state["theme_analysis"]
    if state.get("annulled"):
        synth = Synthesis(
            analise_geral=f"**Resumo geral:** {state['annulled']}\n\n**Adequação ao tema:** {ta.adequacao.replace('_', ' ')}. {ta.justificativa}",
            proximos_passos=["Releia a proposta e o tema antes de escrever.", "Estruture o texto em introdução, dois desenvolvimentos e conclusão com proposta de intervenção."],
        )
    else:
        notes = ", ".join(f"C{c}={scores[c]}" for c in sorted(scores))
        extra = f"\n\n<notas_finais>{notes}; total={sum(scores.values())}; adequação={ta.adequacao}</notas_finais>"
        try:
            synth = await ainvoke_structured(state["llm"], rubric.SYNTH_SYSTEM, rubric.user_payload(state["theme"], state["essay"], extra), Synthesis)
        except Exception:
            synth = Synthesis(analise_geral=f"**Resumo geral:** nota {sum(scores.values())}/1000 ({notes}).", proximos_passos=[])
    comps = [
        CompetencyResult(id=c, nota=scores[c], feedback=state["grades"][c]["feedback"], evidencias=state["grades"][c]["evidencias"])
        for c in range(1, 6)
    ]
    result = EssayResult(
        nota_final=sum(scores.values()), analise_geral=synth.analise_geral, competencias=comps,
        proximos_passos=synth.proximos_passos, anulada=state.get("annulled"),
        meta={"adequacao": ta.adequacao, "warnings": state.get("warnings", []), "audit_note": state["audit"].observacao},
    )
    return {"result": result}


def build_graph():
    g = StateGraph(State)
    g.add_node("analyze_theme", analyze_theme)
    for cid in range(1, 6):
        g.add_node(f"grade_c{cid}", _grader(cid))
        g.add_edge("analyze_theme", f"grade_c{cid}")
    g.add_node("audit", audit)
    g.add_node("finalize", finalize)
    g.add_node("synthesize", synthesize)
    g.add_edge(START, "analyze_theme")
    g.add_edge([f"grade_c{c}" for c in range(1, 6)], "audit")  # join: waits for all five
    g.add_edge("audit", "finalize")
    g.add_edge("finalize", "synthesize")
    g.add_edge("synthesize", END)
    return g.compile()


_GRAPH = None


def get_graph():
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_graph()
    return _GRAPH


class GradingError(ValueError):
    pass


def _prepare(theme: str, essay: str) -> tuple[str, str]:
    theme, essay = (theme or "").strip(), (essay or "").strip()
    if not theme:
        raise GradingError("Informe o tema da redação.")
    if not essay:
        raise GradingError("Informe o texto da redação.")
    if len(essay) > MAX_ESSAY_CHARS:
        raise GradingError(f"Redação muito longa (máx. {MAX_ESSAY_CHARS} caracteres).")
    return theme, essay


def _meta(result: EssayResult, llm_label: str, started: float, samples: int) -> EssayResult:
    result.meta.update({"model": llm_label, "samples": samples, "latency_ms": int((time.time() - started) * 1000), "engine": "mooose-graph/1"})
    return result


async def grade_essay(llm, theme: str, essay: str, *, samples: int = 1, review: bool = True, label: str = "") -> EssayResult:
    theme, essay = _prepare(theme, essay)
    started = time.time()
    state = await get_graph().ainvoke({"llm": llm, "theme": theme, "essay": essay, "samples": min(max(samples, 1), 5), "review": review, "grades": {}, "warnings": []})
    return _meta(state["result"], label, started, samples)


async def stream_grade(llm, theme: str, essay: str, *, samples: int = 1, review: bool = True, label: str = ""):
    """Yields ('progress', node_name) events then ('result', EssayResult)."""
    theme, essay = _prepare(theme, essay)
    started = time.time()
    inputs = {"llm": llm, "theme": theme, "essay": essay, "samples": min(max(samples, 1), 5), "review": review, "grades": {}, "warnings": []}
    result = None
    async for update in get_graph().astream(inputs, stream_mode="updates"):
        for node, payload in update.items():
            yield "progress", node
            if node == "synthesize" and payload and "result" in payload:
                result = payload["result"]
    if result is not None:
        yield "result", _meta(result, label, started, samples)
