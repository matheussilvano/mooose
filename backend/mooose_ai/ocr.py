"""Turn an uploaded image/PDF into text."""
from __future__ import annotations

import base64
from io import BytesIO

from langchain_core.messages import HumanMessage

from .structured import _content_to_text

MAX_FILE_BYTES = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png"}


class OCRError(ValueError):
    pass


async def transcribe_image(llm, content: bytes, mime_type: str) -> str:
    if not content:
        raise OCRError("Arquivo de imagem vazio.")
    if len(content) > MAX_FILE_BYTES:
        raise OCRError("Arquivo de imagem muito grande (máx. 5 MB).")
    data_url = f"data:{mime_type};base64,{base64.b64encode(content).decode()}"
    msg = HumanMessage(
        content=[
            {
                "type": "text",
                "text": "Transcreva fielmente o texto manuscrito/impresso desta redação. Retorne SOMENTE o texto puro, "
                "sem comentários. Não corrija erros do aluno.",
            },
            {"type": "image_url", "image_url": {"url": data_url}},
        ]
    )
    text = _content_to_text((await llm.ainvoke([msg])).content).strip()
    if not text:
        raise OCRError("Nenhum texto detectado na imagem.")
    return text


def extract_pdf_text(content: bytes) -> str:
    from pypdf import PdfReader

    if not content:
        raise OCRError("Arquivo PDF vazio.")
    if len(content) > MAX_FILE_BYTES:
        raise OCRError("Arquivo PDF muito grande (máx. 5 MB).")
    reader = PdfReader(BytesIO(content))
    text = "\n".join((p.extract_text() or "") for p in reader.pages).strip()
    if not text:
        raise OCRError("Nenhum texto detectado no PDF (PDFs escaneados: envie como imagem).")
    return text
