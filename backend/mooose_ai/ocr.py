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


_PADDLE = None


def paddle_available() -> bool:
    import importlib.util

    return importlib.util.find_spec("paddleocr") is not None


def _paddle_engine():
    global _PADDLE
    if _PADDLE is None:
        from paddleocr import PaddleOCR

        # Portuguese (Latin-script) recognition model. Models are downloaded on first use.
        _PADDLE = PaddleOCR(lang="pt", use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False, enable_mkldnn=False)
    return _PADDLE


def paddle_transcribe_sync(content: bytes) -> str:
    """Local, free, offline OCR (PaddleOCR). Great for typed/printed text; handwriting is hit-or-miss."""
    import tempfile

    if not content:
        raise OCRError("Arquivo de imagem vazio.")
    if len(content) > MAX_FILE_BYTES:
        raise OCRError("Arquivo de imagem muito grande (máx. 5 MB).")
    if not paddle_available():
        raise OCRError("PaddleOCR não instalado no servidor (pip install paddleocr paddlepaddle).")
    with tempfile.NamedTemporaryFile(suffix=".png") as f:
        f.write(content)
        f.flush()
        lines: list[str] = []
        for res in _paddle_engine().predict(f.name):
            data = res.json["res"] if hasattr(res, "json") else res
            lines.extend(data.get("rec_texts", []))
    text = "\n".join(line for line in lines if line.strip()).strip()
    if not text:
        raise OCRError("Nenhum texto detectado na imagem.")
    return text


async def paddle_transcribe(content: bytes) -> str:
    import asyncio

    return await asyncio.to_thread(paddle_transcribe_sync, content)


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
