import calendar
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Subscription, User

BASIC_MONTHLY_LIMIT = 10
FULL_DAILY_LIMIT = int(os.environ.get("FULL_SUBSCRIPTION_DAILY_LIMIT", "40"))


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def add_months(value: datetime, months: int) -> datetime:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return value.replace(year=year, month=month, day=day)


def add_cycle(value: datetime, billing_cycle: str) -> datetime:
    return add_months(value, 12 if billing_cycle == "annual" else 1)


def current_month_start(now: Optional[datetime] = None) -> datetime:
    now = now or utcnow()
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def active_subscription(db: Session, user: User) -> Optional[Subscription]:
    now = utcnow()
    return (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user.id,
            Subscription.provider == "abacatepay",
            Subscription.active.is_(True),
            Subscription.status == "active",
            (Subscription.current_period_end.is_(None))
            | (Subscription.current_period_end > now),
        )
        .order_by(Subscription.current_period_end.desc().nullslast())
        .first()
    )


def _reset_usage_windows(subscription: Subscription) -> None:
    now = utcnow()
    month_start = current_month_start(now)
    if not subscription.usage_month_start or subscription.usage_month_start < month_start:
        subscription.usage_month_start = month_start
        subscription.monthly_corrections_used = 0

    today = now.date().isoformat()
    if subscription.usage_day != today:
        subscription.usage_day = today
        subscription.daily_corrections_used = 0


def ensure_correction_access(db: Session, user: User) -> str:
    subscription = active_subscription(db, user)
    if subscription:
        _reset_usage_windows(subscription)
        if (subscription.plan_code or "").startswith("basic_"):
            limit = subscription.monthly_correction_limit or BASIC_MONTHLY_LIMIT
            if (subscription.monthly_corrections_used or 0) >= limit:
                raise HTTPException(
                    status_code=402,
                    detail="Você atingiu o limite mensal do seu plano. Compre créditos avulsos ou faça upgrade.",
                )
        elif (subscription.daily_corrections_used or 0) >= FULL_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="Limite diário de uso justo atingido. Tente novamente amanhã.",
            )
        return "subscription"

    if user.credits is None:
        user.credits = 0
    if user.credits <= 0:
        raise HTTPException(
            status_code=402,
            detail="Créditos insuficientes. Compre um plano ou créditos avulsos para continuar.",
        )
    return "credits"


def consume_correction_access(db: Session, user: User) -> User:
    subscription = active_subscription(db, user)
    if subscription:
        _reset_usage_windows(subscription)
        if (subscription.plan_code or "").startswith("basic_"):
            subscription.monthly_corrections_used = (subscription.monthly_corrections_used or 0) + 1
        else:
            subscription.daily_corrections_used = (subscription.daily_corrections_used or 0) + 1
        db.add(subscription)
        return user

    if user.credits is None:
        user.credits = 0
    if user.credits <= 0:
        raise HTTPException(
            status_code=402,
            detail="Créditos insuficientes. Compre um plano ou créditos avulsos para continuar.",
        )
    user.credits -= 1
    db.add(user)
    return user
