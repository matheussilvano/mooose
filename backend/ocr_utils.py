import os
import re
from typing import Optional, Tuple

OCR_MIN_CHARS = int(os.environ.get("OCR_MIN_CHARS", "800"))

_OCR_BLOCK_PATTERNS = [
    r"proposta de redac[aã]o",
    r"classroom\.google\.com",
    r"\b1/1\b",
    r"\.jpg\b",
    r"\.png\b",
    r"\.pdf\b",
]


def evaluate_ocr_quality(texto: Optional[str]) -> Optional[Tuple[str, str]]:
    texto = (texto or "").strip()
    if len(texto) < OCR_MIN_CHARS:
        return (
            "ocr_text_too_short",
            "Nao conseguimos ler sua redacao. Envie foto mais nitida ou texto digitado.",
        )
    lower = texto.lower()
    for pattern in _OCR_BLOCK_PATTERNS:
        if re.search(pattern, lower):
            return (
                "ocr_invalid_content",
                "Nao conseguimos ler sua redacao. Envie foto mais nitida ou texto digitado.",
            )
    return None


def build_ocr_error_payload(message: str) -> dict:
    return {
        "status": "erro_ocr",
        "mensagem": message,
    }
