# app_routes.py
import json
import os
import cloudinary  # NOVO
import cloudinary.uploader  # NOVO
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Essay, EssayReview
from auth_routes import get_current_user
from corrige_redacao_enem import (
    PROMPT_ENEM_CORRECTOR,
    gerar_correcao_openai,
    extrair_texto_imagem,
    extrair_texto_pdf,
)
from schemas import EnemTextRequest, EssayReviewCreate
from referrals_service import attempt_referral_activation
from subscription_service import consume_correction_access, ensure_correction_access
from cloudinary_utils import (
    build_signed_cloudinary_url,
    derive_cloudinary_public_id,
    infer_cloudinary_format,
    infer_cloudinary_resource_type,
)
from ocr_utils import build_ocr_error_payload, evaluate_ocr_quality

router = APIRouter(prefix="/app", tags=["app"])

# --- Configuração S3 REMOVIDA ---

# +++ NOVA CONFIGURAÇÃO CLOUDINARY +++
# Lê as variáveis de ambiente que você configurou no Render
try:
    cloudinary.config(
        cloud_name=os.environ.get("CLOUD_NAME"),
        api_key=os.environ.get("API_KEY"),
        api_secret=os.environ.get("API_SECRET"),
        secure=True,  # Sempre usar HTTPS
    )
except Exception as e:
    print(f"Alerta: Cloudinary não configurado. Uploads de arquivo falharão. Erro: {e}")


class SimulateCheckout(BaseModel):
    plano: str  # "individual" | "padrao" | "intensivao"


PLANOS_LANCAMENTO = {
    "individual": {"name": "Pacote Individual", "credits": 1, "price": 1.90},
    "padrao": {"name": "Pacote 10 redações", "credits": 10, "price": 9.90},
    "intensivao": {"name": "Pacote Intensivão", "credits": 25, "price": 19.90},
}


def _apply_plan_credit(
    *,
    plano_id: str,
    db: Session,
    current_user: User,
):
    if os.environ.get("ENABLE_SIMULATED_CHECKOUT", "false").lower() != "true":
        raise HTTPException(status_code=404, detail="Checkout simulado desativado.")
    if plano_id not in PLANOS_LANCAMENTO:
        raise HTTPException(status_code=400, detail="Plano inválido.")
    plano = PLANOS_LANCAMENTO[plano_id]
    user_db = db.get(User, current_user.id)
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if user_db.credits is None:
        user_db.credits = 0
    user_db.credits += plano["credits"]
    db.add(user_db)
    db.commit()
    db.refresh(user_db)
    message = (
        f"SUPER promoção de lançamento 🎉 {plano['name']} por R$ {plano['price']:.2f} "
        f"para os primeiros alunos. Você recebeu +{plano['credits']} créditos."
    )
    return {
        "message": message,
        "credits": user_db.credits,
        "plano": plano_id,
        "launch_price": plano["price"],
        "launch_promo": True,
    }


@router.post("/checkout/simular")
def simular_checkout(
    payload: SimulateCheckout,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _apply_plan_credit(
        plano_id=payload.plano,
        db=db,
        current_user=current_user,
    )


@router.post("/checkout/simular/individual")
def simular_checkout_individual(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _apply_plan_credit(
        plano_id="individual",
        db=db,
        current_user=current_user,
    )


@router.post("/checkout/simular/padrao")
def simular_checkout_padrao(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _apply_plan_credit(
        plano_id="padrao",
        db=db,
        current_user=current_user,
    )


@router.post("/checkout/simular/intensivao")
def simular_checkout_intensivao(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _apply_plan_credit(
        plano_id="intensivao",
        db=db,
        current_user=current_user,
    )


# ============================
# Helpers internos
# ============================


def _require_credits(user: User):
    """
    Verifica se o usuário tem créditos suficientes.
    """
    raise HTTPException(status_code=500, detail="_require_credits obsoleto.")


def _debitar_credito(db: Session, user: User) -> User:
    """
    Debita 1 crédito do usuário e devolve o registro atualizado.
    """
    user_db = db.get(User, user.id)
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return consume_correction_access(db, user_db)


def _notas_por_competencia(resultado_json: Dict[str, Any]) -> Dict[int, int]:
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


def _apply_result_to_essay(essay: Essay, resultado_json: Dict[str, Any]) -> None:
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


def _is_admin_user(user: User) -> bool:
    is_admin = getattr(user, "is_admin", False)
    if is_admin:
        return True
    admin_emails = {
        email.strip().lower()
        for email in (os.environ.get("ADMIN_EMAILS", "")).split(",")
        if email.strip()
    }
    return bool(user.email and user.email.lower() in admin_emails)


# ============================
# Correção por TEXTO (app)
# ============================


@router.post("/enem/corrigir-texto")
async def app_corrigir_texto_enem(
    payload: EnemTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_db = db.get(User, current_user.id)
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    ensure_correction_access(db, user_db)
    essay = Essay(
        user_id=user_db.id,
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
        prompt_completo = (
            f"{PROMPT_ENEM_CORRECTOR}\n\n"
            f'TEMA DA PROPOSTA DE REDAÇÃO (ENEM):\n"{payload.tema}"\n\n'
            "Avalie a redação considerando rigorosamente a adequação a esse tema, "
            "especialmente na Competência 2.\n\n"
            "REDAÇÃO DO ALUNO:\n"
            f"{payload.texto}"
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
    user_db = _debitar_credito(db, user_db)
    db.commit()
    db.refresh(user_db)
    db.refresh(essay)
    attempt_referral_activation(db, current_user.id, trigger="first_correction_done")
    return {
        "credits": user_db.credits,
        "free_remaining": 0,
        "resultado": resultado_json,
        "essay_id": essay.id,
    }


# ============================
# Correção por ARQUIVO (foto/PDF)
# ============================


@router.post("/enem/corrigir-arquivo")
async def app_corrigir_arquivo_enem(
    arquivo: UploadFile = File(...),
    tema: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_db = db.get(User, current_user.id)
    if not user_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    ensure_correction_access(db, user_db)
    raw_bytes = await arquivo.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    # +++ LÓGICA CLOUDINARY +++
    arquivo_url_final = ""
    upload_result = {}
    try:
        upload_result = cloudinary.uploader.upload(
            BytesIO(raw_bytes),
            resource_type="auto",
            folder="cooorrige_uploads",  # Organiza numa pasta
            public_id=f"redacao_{current_user.id}_{datetime.utcnow().timestamp()}",
        )
        arquivo_url_final = upload_result.get("secure_url")
        if not arquivo_url_final:
            raise Exception("Cloudinary não retornou uma URL.")
    except Exception as e:
        print(f"ERRO CLOUDINARY: {e}")
        raise HTTPException(
            status_code=500, detail=f"Erro ao salvar arquivo no Cloudinary: {str(e)}"
        )
    # --- Fim da lógica Cloudinary ---

    essay = Essay(
        user_id=user_db.id,
        tema=tema,
        input_type="arquivo",
        arquivo_path=arquivo_url_final,  # Salva a URL do Cloudinary
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
        content_type = (arquivo.content_type or "").lower()
        if content_type in ["image/jpeg", "image/jpg", "image/png"]:
            texto_extraido = await extrair_texto_imagem(arquivo)
        elif content_type == "application/pdf":
            texto_extraido = await extrair_texto_pdf(arquivo)
        else:
            raise HTTPException(
                status_code=400,
                detail="Tipo de arquivo não suportado. Use jpeg/jpg/png ou PDF.",
            )
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
    user_db = _debitar_credito(db, user_db)
    db.commit()
    db.refresh(user_db)
    db.refresh(essay)
    attempt_referral_activation(db, current_user.id, trigger="first_correction_done")
    return {
        "credits": user_db.credits,
        "free_remaining": 0,
        "resultado": resultado_json,
        "essay_id": essay.id,
    }


# ============================
# Histórico + evolução do aluno
# ============================


@router.get("/enem/historico")
def historico_enem(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    essays: List[Essay] = (
        db.query(Essay)
        .filter(Essay.user_id == current_user.id)
        .order_by(Essay.created_at.asc())
        .all()
    )
    essay_ids = [essay.id for essay in essays]
    reviews_by_essay = {}
    if essay_ids:
        reviews = (
            db.query(EssayReview)
            .filter(
                EssayReview.user_id == current_user.id,
                EssayReview.essay_id.in_(essay_ids),
            )
            .all()
        )
        reviews_by_essay = {review.essay_id: review for review in reviews}
    historico = []
    notas = []
    for essay in essays:
        try:
            resultado = json.loads(essay.resultado_json)
        except Exception:
            resultado = None
        if essay.nota_final is not None:
            notas.append(essay.nota_final)

        # 'arquivo_path' já é a URL completa do Cloudinary
        arquivo_url = essay.arquivo_path
        review = reviews_by_essay.get(essay.id)
        review_payload = None
        if review:
            review_payload = {
                "review_id": review.id,
                "stars": review.stars,
                "comment": review.comment,
                "created_at": review.created_at.isoformat()
                if review.created_at
                else None,
                "updated_at": review.updated_at.isoformat()
                if review.updated_at
                else None,
            }

        historico.append(
            {
                "id": essay.id,
                "created_at": essay.created_at.isoformat()
                if essay.created_at
                else None,
                "tema": essay.tema,
                "input_type": essay.input_type,
                "nota_final": essay.nota_final,
                "c1_nota": essay.c1_nota,
                "c2_nota": essay.c2_nota,
                "c3_nota": essay.c3_nota,
                "c4_nota": essay.c4_nota,
                "c5_nota": essay.c5_nota,
                "arquivo_url": arquivo_url,
                "resultado": resultado,
                "review": review_payload,
            }
        )
    stats = {}
    if notas:
        stats = {
            "media_nota_final": sum(notas) / len(notas),
            "melhor_nota": max(notas),
            "pior_nota": min(notas),
            "ultima_nota": notas[-1],
        }
    return {"total": len(essays), "stats": stats, "historico": historico}


@router.get("/enem/essays/{essay_id}/arquivo-url")
def get_essay_arquivo_url(
    essay_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    essay = db.get(Essay, essay_id)
    if not essay:
        raise HTTPException(status_code=404, detail="Redacao nao encontrada.")
    if essay.user_id != current_user.id and not _is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Acesso negado.")
    if not essay.arquivo_path and not essay.arquivo_public_id:
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")

    public_id = essay.arquivo_public_id
    resource_type = essay.arquivo_resource_type
    delivery_type = essay.arquivo_type
    if not public_id:
        public_id = derive_cloudinary_public_id(essay.arquivo_path)
        if not resource_type:
            resource_type = infer_cloudinary_resource_type(essay.arquivo_path)
        if not delivery_type:
            delivery_type = "upload"
    if not public_id:
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado.")

    fmt = infer_cloudinary_format(essay.arquivo_path)
    url, expires_at = build_signed_cloudinary_url(
        public_id=public_id,
        resource_type=resource_type,
        delivery_type=delivery_type,
        format=fmt,
    )
    return {"url": url, "expires_at": expires_at}


# ============================
# Avaliação da correção
# ============================


@router.post("/enem/avaliar")
def avaliar_correcao(
    payload: EssayReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    essay = db.get(Essay, payload.essay_id)
    if not essay or essay.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Redação não encontrada.")

    review = (
        db.query(EssayReview)
        .filter(
            EssayReview.user_id == current_user.id,
            EssayReview.essay_id == payload.essay_id,
        )
        .first()
    )
    if review:
        review.stars = payload.stars
        review.comment = payload.comment
    else:
        review = EssayReview(
            user_id=current_user.id,
            essay_id=payload.essay_id,
            stars=payload.stars,
            comment=payload.comment,
        )
        db.add(review)

    db.commit()
    db.refresh(review)
    return {
        "review_id": review.id,
        "essay_id": review.essay_id,
        "stars": review.stars,
        "comment": review.comment,
    }
