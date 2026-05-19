import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models
from database import engine
from corrige_redacao_enem import router as enem_router, verify_api_key
from auth_routes import router as auth_router
from app_routes import router as app_router
from demo_routes import router as demo_router
from payments_routes import router as payments_router
from abacatepay_routes import router as abacatepay_router
from admin_routes import router as admin_router
from referrals_routes import router as referrals_router
from corrections_routes import router as corrections_router

# Cria tabelas do banco
models.Base.metadata.create_all(bind=engine)

# --- REMOVIDO: Diretório de uploads não é mais necessário no backend ---
# UPLOADS_DIR = Path("uploads")
# UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
# --- FIM DA REMOÇÃO ---

app = FastAPI(
    title="Cooorrige by Mooose",
    description=(
        "Plataforma web para correção automática de redações do ENEM, "
        "com cadastro de alunos, login e controle de créditos."
    ),
    version="1.0.0",
)

def _split_origins(value: str) -> list[str]:
    return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]


allowed_origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://mooose.com.br",
    "https://www.mooose.com.br",
]

for url in (
    os.environ.get("FRONTEND_URL"),
    os.environ.get("FRONTEND_URL_2"),
    *_split_origins(os.environ.get("CORS_ORIGINS", "")),
):
    url = url.rstrip("/") if url else url
    if url and url not in allowed_origins:
        allowed_origins.append(url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REMOVIDO: Não vamos mais servir arquivos estáticos de 'uploads' ---
# app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
# --- FIM DA REMOÇÃO ---


@app.get("/", tags=["healthcheck"])
async def root():
    return {
        "status": "ok",
        "message": "Cooorrige by Mooose API está ativa.",
        "modules": {
            "auth": [
                "/auth/register",
                "/auth/signup",
                "/auth/login",
                "/auth/me",
                "/auth/verify-email",
                "/auth/email/confirm",
                "/auth/link-anon",
                "/auth/google/start",
                "/auth/google/callback",
                "/auth/forgot-password",  # NOVO
                "/auth/reset-password", # NOVO
            ],
            "referrals": [
                "/me/referral",
                "/referrals/activate",
            ],
            "app": [
                "/app/checkout/simular",
                "/app/enem/corrigir-texto",
                "/app/enem/corrigir-arquivo",
                "/app/enem/historico",
                "/app/enem/avaliar",
            ],
            "corrections": [
                "/corrections",
                "/corrections/file",
            ],
            "payments": [
                "/payments/create",
                "/payments/create/individual",
                "/payments/create/padrao",
                "/payments/create/intensivao",
                "/webhooks/mercadopago",
            ],
            "admin": [
                "/admin/metrics/overview",
                "/admin/metrics/absolute",
                "/admin/metrics/users/created",
                "/admin/metrics/corrections",
                "/admin/metrics/sales",
                "/admin/metrics/corrections/by-user",
                "/admin/metrics/reviews",
            ],
            "enem_raw": [
                "POST /api/enem/corrigir-texto",
                "POST /api/enem/corrigir-arquivo",
            ],
        },
    }


# Rotas de autenticação e app
app.include_router(auth_router)
app.include_router(app_router)
app.include_router(demo_router)
app.include_router(payments_router)
app.include_router(abacatepay_router)
app.include_router(admin_router)
app.include_router(referrals_router)
app.include_router(corrections_router)

# Mantém seu router original de correção ENEM
app.include_router(
    enem_router,
    prefix="/api",
    tags=["enem"],
    # dependencies=[Depends(verify_api_key)],  # pode reativar se quiser proteger
)
