"""Deterministic post-processing. Everything here is plain Python: easy to test, no LLM."""
from __future__ import annotations

from statistics import median_low

from .schemas import InterventionGrade

VALID_SCORES = (0, 40, 80, 120, 160, 200)
MIN_WORDS = 50  # below this the text is treated as insufficient (INEP: texto com até 7 linhas é zerado)

# Caps taken from the Mooose rubric for theme tangency.
TANGENCY_CAPS = {
    "tangenciamento_parcial": {2: 120, 3: 160, "total": 640},
    "tangenciamento_grave": {2: 80, 3: 120, "total": 640},
}


def snap_score(value: object) -> int:
    """Snap to the nearest valid ENEM score. Ties go DOWN (never inflate a grade)."""
    try:
        v = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0
    v = max(0.0, min(200.0, v))
    return min(VALID_SCORES, key=lambda s: (abs(s - v), s))


def aggregate_samples(scores: list[int]) -> int:
    """Self-consistency: the median of N independent samples (lower median on even N)."""
    snapped = [snap_score(s) for s in scores]
    return median_low(snapped) if snapped else 0


def score_intervention(g: InterventionGrade) -> int:
    """Competency 5 score derived from verifiable features (see rubric)."""
    elements = sum([g.agente, g.acao, g.meio_modo, g.finalidade, g.detalhamento in {"simples", "aprofundado"}])
    if elements == 0:
        return 0
    if elements <= 1:
        return 40
    if elements == 2:
        return 80
    if elements in (3, 4):
        score = 120
    elif g.detalhamento == "aprofundado" and g.articulada_ao_problema:
        score = 200
    else:
        score = 160
    if g.detalhamento == "vago":
        score = min(score, 120)
    if not g.articulada_ao_problema:
        score = min(score, 120)
    return score


def word_count(text: str) -> int:
    return len(text.split())


def annulment_reason(adequacao: str, dissertativo: bool, text: str) -> str | None:
    if word_count(text) < MIN_WORDS:
        return "Texto insuficiente: poucas linhas para configurar uma redação (nota zero no ENEM)."
    if adequacao == "fuga_total":
        return "Fuga total ao tema (nota zero no ENEM)."
    if not dissertativo:
        return "Texto fora do tipo dissertativo-argumentativo (nota zero no ENEM)."
    return None


def apply_tangency_caps(scores: dict[int, int], adequacao: str) -> dict[int, int]:
    caps = TANGENCY_CAPS.get(adequacao)
    if not caps:
        return dict(scores)
    out = dict(scores)
    for cid in (2, 3):
        out[cid] = min(out[cid], caps[cid])  # type: ignore[index]
    total_cap = caps["total"]  # type: ignore[index]
    while sum(out.values()) > total_cap:  # trim the highest competency by one level
        cid = max(out, key=lambda c: (out[c], -c))
        out[cid] -= 40
    return out


def apply_audit(scores: dict[int, int], adjustments: list[tuple[int, int]], max_delta: int = 40) -> dict[int, int]:
    """Apply auditor suggestions, bounded to +-max_delta (one level) per competency."""
    out = dict(scores)
    for cid, suggested in adjustments:
        if cid not in out:
            continue
        target = snap_score(suggested)
        delta = max(-max_delta, min(max_delta, target - out[cid]))
        out[cid] = snap_score(out[cid] + delta)
    return out
