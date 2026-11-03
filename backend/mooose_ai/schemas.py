"""Pydantic schemas shared by the grading pipeline."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Adequacao = Literal["plena", "tangenciamento_parcial", "tangenciamento_grave", "fuga_total"]


class ThemeAnalysis(BaseModel):
    """Output of the first node: how well does the essay address the theme?"""

    adequacao: Adequacao = Field(description="Adequação ao tema proposto")
    dissertativo_argumentativo: bool = Field(
        description="True se o texto é dissertativo-argumentativo em prosa"
    )
    tese: str = Field(default="", description="Tese defendida pelo aluno, em uma frase")
    justificativa: str = Field(default="", description="Justificativa curta da classificação")


class CompetencyGrade(BaseModel):
    """Grade of one competency (C1, C2, C3 and C4)."""

    nota: int = Field(description="Um de 0, 40, 80, 120, 160, 200")
    evidencias: list[str] = Field(
        default_factory=list,
        description="Trechos curtos da redação que justificam a nota (citações literais)",
    )
    feedback: str = Field(description="Feedback ao aluno em Markdown")


class InterventionGrade(BaseModel):
    """Competency 5 is graded by checking features; the score is computed in code."""

    agente: bool
    acao: bool
    meio_modo: bool
    finalidade: bool
    detalhamento: Literal["ausente", "vago", "simples", "aprofundado"]
    articulada_ao_problema: bool = True
    evidencias: list[str] = Field(default_factory=list)
    feedback: str


class AuditAdjustment(BaseModel):
    id: int = Field(ge=1, le=5)
    nota_sugerida: int
    motivo: str


class Audit(BaseModel):
    """Second-opinion pass over the five grades."""

    adjustments: list[AuditAdjustment] = Field(default_factory=list)
    observacao: str = ""


class Synthesis(BaseModel):
    analise_geral: str
    proximos_passos: list[str] = Field(default_factory=list)


class CompetencyResult(BaseModel):
    id: int
    nota: int
    feedback: str
    evidencias: list[str] = Field(default_factory=list)


class EssayResult(BaseModel):
    """Final payload. `nota_final`, `analise_geral` and `competencias[*].{id,nota,feedback}`
    match the legacy Mooose response, so existing clients keep working."""

    nota_final: int
    analise_geral: str
    competencias: list[CompetencyResult]
    proximos_passos: list[str] = Field(default_factory=list)
    meta: dict = Field(default_factory=dict)
    anulada: Optional[str] = None
