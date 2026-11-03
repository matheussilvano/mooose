import json
import os
from datetime import datetime
from io import BytesIO
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from sqlalchemy.orm import Session, object_session

from anon_service import get_or_create_anon_session
from auth_routes import get_current_user_optional
from corrige_redacao_enem import (
    PROMPT_ENEM_CORRECTOR,
    extrair_texto_imagem,
    extrair_texto_pdf,
    gerar_correcao_openai,
)
from database import get_db
from models import Essay, User
from referrals_service import attempt_referral_activation
from schemas import CorrectionResponse, CorrectionTextRequest
from ocr_utils import build_ocr_error_payload, evaluate_ocr_quality
from subscription_service import consume_correction_access, ensure_correction_access
from utils import get_client_ip

router = APIRouter(tags=["corrections"])

try:
    cloudinary.config(
        cloud_name=os.environ.get("CLOUD_NAME"),
        api_key=os.environ.get("API_KEY"),
        api_secret=os.environ.get("API_SECRET"),
        secure=True,
    )
except Exception as e:
    print(f"Alerta: Cloudinary não configurado. Uploads de arquivo falharão. Erro: {e}")


def _notas_por_competencia(resultado_json):
    notas = {}
    comps = resultado_json.get("competencias") or []
    if isinstance(comps, list):
        for comp in comps:
            if isinstance(comp, dict):
                cid = comp.get("id")
                nota = comp.get("nota")
                if isinstance(cid, int) and isinstance(nota, int):
                    notas[cid] = nota
    return notas


def _apply_result_to_essay(essay: Essay, resultado_json: dict) -> None:
    notas_comp = _notas_por_competencia(resultado_json)
    nota_final = resultado_json.get("nota_final")
    nota_final_int = int(nota_final) if isinstance(nota_final, (int, float)) else None
    essay.nota_final = nota_final_int
    essay.c1_nota = notas_comp.get(1)
    essay.c2_nota = notas_comp.get(2)
    essay.c3_nota = notas_comp.get(3)
    essay.c4_nota = notas_comp.get(4)
    essay.c5_nota = notas_comp.get(5)


def _set_essay_error(
    essay: Essay,
    *,
    status: str,
    error_code: str,
    error_message: str,
    resultado_json: dict,
) -> None:
    essay.status = status
    essay.error_code = error_code
    essay.error_message = error_message
    essay.resultado_json = json.dumps(resultado_json, ensure_ascii=False)
    essay.nota_final = None
    essay.c1_nota = None
    essay.c2_nota = None
    essay.c3_nota = None
    essay.c4_nota = None
    essay.c5_nota = None


def _gate_response(
    *,
    remaining: int,
    requires_auth: bool,
    requires_payment: bool,
) -> CorrectionResponse:
    if requires_auth:
        next_action = "PROMPT_SIGNUP"
    elif requires_payment:
        next_action = "PROMPT_PAYWALL"
    else:
        next_action = "CONTINUE"
    return CorrectionResponse(
        free_remaining=remaining,
        requires_auth=requires_auth,
        requires_payment=requires_payment,
        next_action=next_action,
    )


def _debit_credit(db: Session, user: User) -> None:
    if object_session(user) is not db:
        user = db.merge(user)
    consume_correction_access(db, user)


def _ensure_user_attached(db: Session, user: Optional[User]) -> Optional[User]:
    if user is None:
        return None
    if object_session(user) is db:
        return user
    return db.merge(user)


async def _build_text_correction(
    *,
    tema: str,
    texto: str,
) -> dict:
    prompt_completo = (
        f"{PROMPT_ENEM_CORRECTOR}\n\n"
        f'TEMA DA PROPOSTA DE REDAÇÃO (ENEM):\n"{tema}"\n\n'
        "Avalie a redação considerando rigorosamente a adequação a esse tema, "
        "especialmente na Competência 2.\n\n"
        "REDAÇÃO DO ALUNO:\n"
        f"{texto}"
    )
    resultado_json = await gerar_correcao_openai(prompt_completo)
    return resultado_json


async def _extract_text_from_file(arquivo: UploadFile) -> str:
    content_type = (arquivo.content_type or "").lower()
    if content_type in ["image/jpeg", "image/jpg", "image/png"]:
        return await extrair_texto_imagem(arquivo)
    if content_type == "application/pdf":
        return await extrair_texto_pdf(arquivo)
    raise HTTPException(
        status_code=400,
        detail="Tipo de arquivo não suportado. Use jpeg/jpg/png ou PDF.",
    )


@router.post("/corrections", response_model=CorrectionResponse)
async def correction_text(
    payload: CorrectionTextRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_anon_id: Optional[str] = Header(default=None, alias="X-ANON-ID"),
    x_device_id: Optional[str] = Header(default=None, alias="X-DEVICE-ID"),
):
    if not x_anon_id:
        raise HTTPException(status_code=400, detail="X-ANON-ID obrigatório.")

    client_ip = get_client_ip(request)
    device_id = payload.device_id or x_device_id
    anon_session = get_or_create_anon_session(
        db,
        anon_id=x_anon_id,
        ip=client_ip,
        device_id=device_id,
    )

    remaining = 0
    current_user = _ensure_user_attached(db, current_user)

    if current_user is None:
        return _gate_response(
            remaining=remaining,
            requires_auth=True,
            requires_payment=False,
        )
    else:
        try:
            ensure_correction_access(db, current_user)
        except HTTPException:
            return _gate_response(
                remaining=remaining,
                requires_auth=False,
                requires_payment=True,
            )

    essay = Essay(
        user_id=current_user.id if current_user else None,
        anon_id=x_anon_id,
        tema=payload.tema,
        input_type="texto",
        texto=payload.texto,
        status="pending",
        resultado_json=json.dumps({}, ensure_ascii=False),
    )
    db.add(essay)
    db.flush()

    try:
        essay.status = "evaluating"
        resultado_json = await _build_text_correction(
            tema=payload.tema,
            texto=payload.texto,
        )
    except HTTPException as e:
        _set_essay_error(
            essay,
            status="error",
            error_code="correction_failed",
            error_message=str(e.detail),
            resultado_json={"status": "error", "mensagem": str(e.detail)},
        )
        db.commit()
        raise

    essay.status = "done"
    essay.error_code = None
    essay.error_message = None
    essay.resultado_json = json.dumps(resultado_json, ensure_ascii=False)
    _apply_result_to_essay(essay, resultado_json)

    _debit_credit(db, current_user)

    db.add(anon_session)
    if current_user:
        db.add(current_user)
    db.commit()
    db.refresh(essay)
    if current_user:
        db.refresh(current_user)
        attempt_referral_activation(db, current_user.id, trigger="first_correction_done")

    return CorrectionResponse(
        free_remaining=remaining,
        requires_auth=False,
        requires_payment=False,
        next_action="CONTINUE",
        resultado=resultado_json,
        essay_id=essay.id,
        credits=current_user.credits if current_user else None,
    )


@router.post("/corrections/file", response_model=CorrectionResponse)
async def correction_file(
    request: Request,
    arquivo: UploadFile = File(...),
    tema: str = Form(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    x_anon_id: Optional[str] = Header(default=None, alias="X-ANON-ID"),
    x_device_id: Optional[str] = Header(default=None, alias="X-DEVICE-ID"),
):
    if not x_anon_id:
        raise HTTPException(status_code=400, detail="X-ANON-ID obrigatório.")

    client_ip = get_client_ip(request)
    device_id = x_device_id
    anon_session = get_or_create_anon_session(
        db,
        anon_id=x_anon_id,
        ip=client_ip,
        device_id=device_id,
    )

    remaining = 0
    current_user = _ensure_user_attached(db, current_user)

    if current_user is None:
        return _gate_response(
            remaining=remaining,
            requires_auth=True,
            requires_payment=False,
        )
    else:
        try:
            ensure_correction_access(db, current_user)
        except HTTPException:
            return _gate_response(
                remaining=remaining,
                requires_auth=False,
                requires_payment=True,
            )

    raw_bytes = await arquivo.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    arquivo_url_final = ""
    upload_result = {}
    try:
        upload_result = cloudinary.uploader.upload(
            BytesIO(raw_bytes),
            resource_type="auto",
            folder="cooorrige_uploads",
            public_id=f"redacao_{current_user.id if current_user else 'anon'}_{datetime.utcnow().timestamp()}",
        )
        arquivo_url_final = upload_result.get("secure_url")
        if not arquivo_url_final:
            raise Exception("Cloudinary não retornou uma URL.")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erro ao salvar arquivo no Cloudinary: {str(e)}"
        )

    essay = Essay(
        user_id=current_user.id if current_user else None,
        anon_id=x_anon_id,
        tema=tema,
        input_type="arquivo",
        arquivo_path=arquivo_url_final,
        arquivo_public_id=upload_result.get("public_id"),
        arquivo_resource_type=upload_result.get("resource_type"),
        arquivo_type=upload_result.get("type"),
        status="pending",
        resultado_json=json.dumps({}, ensure_ascii=False),
    )
    db.add(essay)
    db.flush()

    await arquivo.seek(0)
    try:
        texto_extraido = await _extract_text_from_file(arquivo)
    except Exception as e:
        if "public_id" in upload_result:
            cloudinary.uploader.destroy(upload_result["public_id"])
        _set_essay_error(
            essay,
            status="ocr_failed",
            error_code="ocr_extract_failed",
            error_message=str(getattr(e, "detail", e)),
            resultado_json=build_ocr_error_payload(
                "Nao conseguimos ler sua redacao. Envie foto mais nitida ou texto digitado."
            ),
        )
        db.commit()
        raise

    essay.texto = texto_extraido
    guardrail = evaluate_ocr_quality(texto_extraido)
    if guardrail:
        error_code, message = guardrail
        _set_essay_error(
            essay,
            status="ocr_failed",
            error_code=error_code,
            error_message=message,
            resultado_json=build_ocr_error_payload(message),
        )
        db.commit()
        raise HTTPException(status_code=422, detail=message)

    try:
        essay.status = "evaluating"
        prompt_completo = (
            f"{PROMPT_ENEM_CORRECTOR}\n\n"
            f'TEMA DA PROPOSTA DE REDAÇÃO (ENEM):\n"{tema}"\n\n'
            "Avalie a redação considerando rigorosamente a adequação a esse tema, "
            "especialmente na Competência 2.\n\n"
            "REDAÇÃO DO ALUNO (transcrita do arquivo enviado):\n"
            f"{texto_extraido}"
        )
        resultado_json = await gerar_correcao_openai(prompt_completo)
    except HTTPException as e:
        _set_essay_error(
            essay,
            status="error",
            error_code="correction_failed",
            error_message=str(e.detail),
            resultado_json={"status": "error", "mensagem": str(e.detail)},
        )
        db.commit()
        raise

    essay.status = "done"
    essay.error_code = None
    essay.error_message = None
    essay.resultado_json = json.dumps(resultado_json, ensure_ascii=False)
    _apply_result_to_essay(essay, resultado_json)

    _debit_credit(db, current_user)

    db.add(anon_session)
    if current_user:
        db.add(current_user)
    db.commit()
    db.refresh(essay)
    if current_user:
        db.refresh(current_user)
        attempt_referral_activation(db, current_user.id, trigger="first_correction_done")

    return CorrectionResponse(
        free_remaining=remaining,
        requires_auth=False,
        requires_payment=False,
        next_action="CONTINUE",
        resultado=resultado_json,
        essay_id=essay.id,
        credits=current_user.credits if current_user else None,
    )
