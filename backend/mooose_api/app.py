"""Lightweight self-host entrypoint: `uvicorn mooose_api.app:app` (no database, no accounts)."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .router import router

app = FastAPI(
    title="Mooose Open API",
    description="Correção de redações do ENEM com IA open-source. Traga sua própria chave (BYOK).",
    version="2.0.0",
)
origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "name": "Mooose Open API", "docs": "/docs"}
