import io

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app_routes
import models
from database import get_db
from main import app
from auth_routes import get_current_user
from referrals_service import generate_referral_code


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    try:
        yield client
    finally:
        app.dependency_overrides = {}


def create_user(db_session, *, email, credits=2, free_used=1):
    user = models.User(
        email=email,
        full_name=None,
        hashed_password="hash",
        credits=credits,
        is_verified=True,
        referral_code=generate_referral_code(db_session),
        free_used=free_used,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_ocr_fail_does_not_debit(client, db_session, monkeypatch):
    user = create_user(db_session, email="user1@example.com", credits=2, free_used=1)

    def override_get_current_user():
        return db_session.get(models.User, user.id)

    app.dependency_overrides[get_current_user] = override_get_current_user

    def fake_upload(*args, **kwargs):
        return {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
            "public_id": "cooorrige_uploads/test",
            "resource_type": "image",
            "type": "upload",
        }

    monkeypatch.setattr(app_routes.cloudinary.uploader, "upload", fake_upload)

    async def fake_ocr(*args, **kwargs):
        return "texto curto"

    monkeypatch.setattr(app_routes, "extrair_texto_imagem", fake_ocr)

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("gerar_correcao_openai nao deveria ser chamado")

    monkeypatch.setattr(app_routes, "gerar_correcao_openai", fail_if_called)

    files = {"arquivo": ("teste.png", io.BytesIO(b"fake"), "image/png")}
    data = {"tema": "Tema"}
    response = client.post("/app/enem/corrigir-arquivo", files=files, data=data)

    assert response.status_code == 422
    essay = db_session.query(models.Essay).first()
    assert essay is not None
    assert essay.status == "ocr_failed"
    assert essay.nota_final is None
    assert essay.error_code is not None
    user_db = db_session.get(models.User, user.id)
    assert user_db.credits == 2


def test_file_correction_requires_paid_credit_before_upload(client, db_session, monkeypatch):
    user = create_user(db_session, email="zero@example.com", credits=0, free_used=0)

    def override_get_current_user():
        return db_session.get(models.User, user.id)

    app.dependency_overrides[get_current_user] = override_get_current_user

    def fail_upload(*args, **kwargs):
        raise AssertionError("upload nao deveria ser chamado sem credito")

    monkeypatch.setattr(app_routes.cloudinary.uploader, "upload", fail_upload)

    files = {"arquivo": ("teste.png", io.BytesIO(b"fake"), "image/png")}
    data = {"tema": "Tema"}
    response = client.post("/app/enem/corrigir-arquivo", files=files, data=data)

    assert response.status_code == 402
    assert db_session.query(models.Essay).count() == 0


def test_ocr_ok_debits_and_marks_done(client, db_session, monkeypatch):
    user = create_user(db_session, email="user2@example.com", credits=2, free_used=1)

    def override_get_current_user():
        return db_session.get(models.User, user.id)

    app.dependency_overrides[get_current_user] = override_get_current_user

    def fake_upload(*args, **kwargs):
        return {
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
            "public_id": "cooorrige_uploads/test",
            "resource_type": "image",
            "type": "upload",
        }

    monkeypatch.setattr(app_routes.cloudinary.uploader, "upload", fake_upload)

    async def fake_ocr(*args, **kwargs):
        return "a" * 800

    monkeypatch.setattr(app_routes, "extrair_texto_imagem", fake_ocr)

    async def fake_correcao(*args, **kwargs):
        return {
            "nota_final": 600,
            "competencias": [
                {"id": 1, "nota": 120},
                {"id": 2, "nota": 120},
                {"id": 3, "nota": 120},
                {"id": 4, "nota": 120},
                {"id": 5, "nota": 120},
            ],
        }

    monkeypatch.setattr(app_routes, "gerar_correcao_openai", fake_correcao)

    files = {"arquivo": ("teste.png", io.BytesIO(b"fake"), "image/png")}
    data = {"tema": "Tema"}
    response = client.post("/app/enem/corrigir-arquivo", files=files, data=data)

    assert response.status_code == 200
    payload = response.json()
    assert payload["credits"] == 1

    essay = db_session.query(models.Essay).first()
    assert essay is not None
    assert essay.status == "done"
    assert essay.nota_final == 600
    assert essay.c1_nota == 120


def test_signed_url_blocks_other_user(client, db_session):
    owner = create_user(db_session, email="owner@example.com", credits=1, free_used=1)
    other = create_user(db_session, email="other@example.com", credits=1, free_used=1)

    essay = models.Essay(
        user_id=owner.id,
        tema="Tema",
        input_type="arquivo",
        texto="texto",
        arquivo_path="https://res.cloudinary.com/demo/image/upload/v1/test.jpg",
        arquivo_public_id="cooorrige_uploads/test",
        arquivo_resource_type="image",
        arquivo_type="upload",
        status="done",
        resultado_json="{}",
    )
    db_session.add(essay)
    db_session.commit()
    db_session.refresh(essay)

    def override_get_current_user():
        return db_session.get(models.User, other.id)

    app.dependency_overrides[get_current_user] = override_get_current_user

    response = client.get(f"/app/enem/essays/{essay.id}/arquivo-url")
    assert response.status_code == 403
