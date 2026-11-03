import base64
import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request as UrlRequest, urlopen

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_routes import get_current_user
from database import get_db
from models import AbacatePayEvent, Subscription, User
from subscription_service import BASIC_MONTHLY_LIMIT, active_subscription, add_cycle, subscription_payload, utcnow

logger = logging.getLogger(__name__)

router = APIRouter(tags=["abacatepay"])

ABACATE_API_BASE = os.environ.get("ABACATE_API_BASE", "https://api.abacatepay.com/v2").rstrip("/")
ABACATE_PAY_KEY = os.environ.get("ABACATE_PAY_KEY")
ABACATE_WEBHOOK_SECRET = os.environ.get("ABACATE_WEBHOOK_SECRET")
ABACATEPAY_PUBLIC_KEY = os.environ.get(
    "ABACATEPAY_PUBLIC_KEY",
    "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9",
)

PLANS = {
    "individual": {
        "name": "Correção avulsa",
        "description": "1 correção de redação",
        "price_cents": 190,
        "credits": 1,
        "cycle": None,
        "checkout_type": "one_time",
    },
    "basic_monthly": {
        "name": "Mooose Básico Mensal",
        "description": "10 correções por mês",
        "price_cents": 990,
        "cycle": "MONTHLY",
        "billing_cycle": "monthly",
        "monthly_limit": BASIC_MONTHLY_LIMIT,
        "checkout_type": "subscription",
    },
    "basic_annual": {
        "name": "Mooose Básico Anual",
        "description": "10 correções por mês com 2 meses grátis",
        "price_cents": 9900,
        "cycle": "ANNUALLY",
        "billing_cycle": "annual",
        "monthly_limit": BASIC_MONTHLY_LIMIT,
        "checkout_type": "subscription",
    },
    "full_monthly": {
        "name": "Mooose Full Mensal",
        "description": "Correções ilimitadas para uso individual",
        "price_cents": 1990,
        "cycle": "MONTHLY",
        "billing_cycle": "monthly",
        "monthly_limit": None,
        "checkout_type": "subscription",
    },
    "full_annual": {
        "name": "Mooose Full Anual",
        "description": "Correções ilimitadas com 2 meses grátis",
        "price_cents": 19900,
        "cycle": "ANNUALLY",
        "billing_cycle": "annual",
        "monthly_limit": None,
        "checkout_type": "subscription",
    },
}


def _require_key() -> str:
    if not ABACATE_PAY_KEY:
        raise HTTPException(status_code=500, detail="ABACATE_PAY_KEY nao configurado.")
    return ABACATE_PAY_KEY


def _request_abacate(method: str, path: str, payload: Optional[dict] = None, query: Optional[dict] = None) -> dict:
    url = f"{ABACATE_API_BASE}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = UrlRequest(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {_require_key()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "MoooseBackend/1.0",
        },
    )
    try:
        with urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"error": body}
        error_text = str(parsed.get("error") or body)
        if exc.code == 401:
            logger.error("AbacatePay recusou a chave configurada (%s %s)", method, path)
            raise HTTPException(
                status_code=502,
                detail="A integração de pagamento está temporariamente indisponível.",
            )
        if exc.code == 403:
            logger.error("Chave AbacatePay sem permissão para %s %s", method, path)
            raise HTTPException(
                status_code=502,
                detail="A integração de pagamento não tem permissão para concluir esta operação.",
            )
        if exc.code == 404 or "Product not found" in error_text:
            return {"success": False, "error": "not_found", "status_code": 404, **parsed}
        logger.exception("Erro HTTP AbacatePay %s %s", method, path)
        raise HTTPException(status_code=502, detail=parsed.get("error") or body or str(exc))
    except Exception as exc:
        logger.exception("Erro AbacatePay %s %s", method, path)
        raise HTTPException(status_code=502, detail=f"Erro na AbacatePay: {str(exc)}")


def _product_external_id(plan_code: str) -> str:
    return f"mooose-{plan_code.replace('_', '-')}-v1"


def _env_product_id(plan_code: str) -> Optional[str]:
    return os.environ.get(f"ABACATE_PRODUCT_{plan_code.upper()}")


def _ensure_product(plan_code: str) -> str:
    env_id = _env_product_id(plan_code)
    if env_id:
        return env_id
    plan = PLANS[plan_code]
    external_id = _product_external_id(plan_code)
    existing = _request_abacate("GET", "/products/get", query={"externalId": external_id})
    if existing.get("success") and existing.get("data", {}).get("id"):
        return existing["data"]["id"]
    created = _request_abacate(
        "POST",
        "/products/create",
        {
            "externalId": external_id,
            "name": plan["name"],
            "description": plan["description"],
            "price": plan["price_cents"],
            "currency": "BRL",
            **({"cycle": plan["cycle"]} if plan.get("cycle") else {}),
        },
    )
    product_id = created.get("data", {}).get("id")
    if not product_id:
        raise HTTPException(status_code=502, detail="Produto AbacatePay inválido.")
    return product_id


def _frontend_url(path: str) -> str:
    base = os.environ.get("FRONTEND_URL", "https://www.mooose.com.br").rstrip("/")
    return f"{base}{path}"


def _external_id(user_id: int, plan_code: str) -> str:
    return f"mooose:{user_id}:{plan_code}:{int(time.time())}"


def _parse_external_id(value: Optional[str]) -> tuple[Optional[int], Optional[str]]:
    if not value:
        return None, None
    parts = value.split(":")
    if len(parts) < 3 or parts[0] != "mooose":
        return None, None
    try:
        return int(parts[1]), parts[2]
    except ValueError:
        return None, parts[2]


def _parse_dt(value: Optional[str]) -> datetime:
    if not value:
        return utcnow()
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return utcnow()


def _verify_signature(raw_body: bytes, signature: Optional[str]) -> None:
    if not signature:
        raise HTTPException(status_code=401, detail="Assinatura ausente.")
    expected = hmac.new(
        ABACATEPAY_PUBLIC_KEY.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).digest()
    expected_b64 = base64.b64encode(expected).decode("utf-8")
    if not hmac.compare_digest(expected_b64, signature):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")


@router.get("/abacatepay/plans")
def list_abacatepay_plans():
    return {"plans": PLANS}


@router.get("/abacatepay/subscription/me")
def current_abacatepay_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"subscription": subscription_payload(active_subscription(db, current_user))}


@router.post("/abacatepay/checkout/{plan_code}")
def create_abacatepay_checkout(
    plan_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if plan_code not in PLANS:
        raise HTTPException(status_code=400, detail="Plano inválido.")
    plan = PLANS[plan_code]
    current_subscription = active_subscription(db, current_user)
    if current_subscription and plan["checkout_type"] == "subscription":
        if current_subscription.plan_code == plan_code:
            raise HTTPException(status_code=409, detail="Você já está nesse plano.")
        if plan_code != "individual":
            raise HTTPException(
                status_code=409,
                detail="Você já tem uma assinatura ativa. Gerencie seu plano pelo perfil.",
            )
    product_id = _ensure_product(plan_code)
    payload = {
        "items": [{"id": product_id, "quantity": 1}],
        "externalId": _external_id(current_user.id, plan_code),
        "returnUrl": _frontend_url("/paywall"),
        "completionUrl": _frontend_url("/paywall/sucesso"),
        "metadata": {
            "user_id": current_user.id,
            "plan_code": plan_code,
        },
    }
    if plan["checkout_type"] == "subscription":
        payload["methods"] = ["CARD"]
        result = _request_abacate("POST", "/subscriptions/create", payload)
    else:
        payload["methods"] = ["PIX", "CARD"]
        result = _request_abacate("POST", "/checkouts/create", payload)

    data = result.get("data") or {}
    checkout_url = data.get("url")
    if not result.get("success") or not checkout_url:
        raise HTTPException(status_code=502, detail=result.get("error") or "Checkout inválido.")
    return {
        "checkout_url": checkout_url,
        "checkout_id": data.get("id"),
        "plan_code": plan_code,
        "price_cents": plan["price_cents"],
    }


def _event_identity(event: dict) -> tuple[Optional[int], Optional[str], Optional[str], Optional[str]]:
    data = event.get("data") or {}
    checkout = data.get("checkout") or {}
    payment = data.get("payment") or {}
    subscription = data.get("subscription") or {}
    metadata = checkout.get("metadata") or payment.get("metadata") or {}
    user_id = metadata.get("user_id")
    plan_code = metadata.get("plan_code")
    if user_id is not None:
        try:
            user_id = int(user_id)
        except (TypeError, ValueError):
            user_id = None
    if not user_id or not plan_code:
        parsed_user_id, parsed_plan_code = _parse_external_id(
            payment.get("externalId") or checkout.get("externalId")
        )
        user_id = user_id or parsed_user_id
        plan_code = plan_code or parsed_plan_code
    return user_id, plan_code, checkout.get("id"), subscription.get("id")


def _activate_subscription(db: Session, event: dict, user_id: int, plan_code: str) -> None:
    plan = PLANS.get(plan_code)
    if not plan or plan["checkout_type"] != "subscription":
        return
    data = event.get("data") or {}
    subscription_data = data.get("subscription") or {}
    checkout = data.get("checkout") or {}
    provider_subscription_id = subscription_data.get("id")
    if not provider_subscription_id:
        return
    start = _parse_dt(subscription_data.get("updatedAt") or subscription_data.get("createdAt"))
    period_end = add_cycle(start, plan["billing_cycle"])
    subscription = (
        db.query(Subscription)
        .filter(Subscription.provider_subscription_id == provider_subscription_id)
        .first()
    )
    if not subscription:
        subscription = Subscription(
            user_id=user_id,
            provider="abacatepay",
            provider_subscription_id=provider_subscription_id,
            monthly_corrections_used=0,
            daily_corrections_used=0,
        )
    subscription.plan_code = plan_code
    subscription.provider_checkout_id = checkout.get("id")
    subscription.status = "active"
    subscription.active = True
    subscription.current_period_start = start
    subscription.current_period_end = period_end
    subscription.monthly_correction_limit = plan.get("monthly_limit")
    subscription.raw_json = json.dumps(data, ensure_ascii=False)
    db.add(subscription)


@router.post("/webhooks/abacatepay")
async def abacatepay_webhook(
    request: Request,
    db: Session = Depends(get_db),
    webhookSecret: Optional[str] = None,
    x_webhook_signature: Optional[str] = Header(default=None, alias="X-Webhook-Signature"),
):
    if ABACATE_WEBHOOK_SECRET and webhookSecret != ABACATE_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Webhook secret inválido.")
    raw_body = await request.body()
    if x_webhook_signature:
        _verify_signature(raw_body, x_webhook_signature)
    elif ABACATE_WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="Assinatura ausente.")

    event = json.loads(raw_body.decode("utf-8"))
    event_id = event.get("id")
    event_type = event.get("event")
    if not event_id or not event_type:
        raise HTTPException(status_code=400, detail="Evento inválido.")

    existing = db.query(AbacatePayEvent).filter(AbacatePayEvent.event_id == event_id).first()
    if existing:
        return {"status": "ok", "message": "Evento já processado."}

    user_id, plan_code, checkout_id, subscription_id = _event_identity(event)
    event_record = AbacatePayEvent(
        event_id=event_id,
        event_type=event_type,
        user_id=user_id,
        plan_code=plan_code,
        provider_checkout_id=checkout_id,
        provider_subscription_id=subscription_id,
        raw_json=json.dumps(event, ensure_ascii=False),
        processed=False,
    )
    db.add(event_record)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return {"status": "ok", "message": "Evento já processado."}

    if event_type == "checkout.completed" and plan_code == "individual" and user_id:
        user = db.get(User, user_id)
        if user:
            user.credits = (user.credits or 0) + PLANS["individual"]["credits"]
            db.add(user)
    elif event_type in {"subscription.completed", "subscription.renewed"} and user_id and plan_code:
        _activate_subscription(db, event, user_id, plan_code)
    elif event_type == "subscription.cancelled" and subscription_id:
        subscription = (
            db.query(Subscription)
            .filter(Subscription.provider_subscription_id == subscription_id)
            .first()
        )
        if subscription:
            subscription.status = "cancelled"
            subscription.active = False
            subscription.raw_json = json.dumps(event.get("data") or {}, ensure_ascii=False)
            db.add(subscription)

    event_record.processed = True
    db.add(event_record)
    db.commit()
    return {"status": "ok"}
