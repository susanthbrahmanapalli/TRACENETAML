"""
Unit and Integration Tests for Case Lifecycle, Audit Trail, and API Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.backend.database import Base, get_db
from src.backend.main import app
from src.backend.models import Case, Alert, AuditLog
from src.backend.schemas import CaseCreate, CaseUpdate
from src.backend.services.case_service import case_service
from src.backend.data_generator import seed_database
from src.backend.graph_engine import graph_engine

# Setup in-memory test DB with StaticPool so all sessions share the same connection
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# Seed test database once
init_session = TestingSessionLocal()
seed_database(init_session)
graph_engine.load_from_db(init_session)
init_session.close()

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_health_check_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["currency"] == "INR"
    assert data["currency_symbol"] == "₹"

def test_case_state_transitions():
    db = TestingSessionLocal()
    # 1. Create case
    case_in = CaseCreate(
        title="Smurfing Ring Investigation",
        priority="HIGH",
        primary_account_id="ACC-IND-0021",
        initial_note="Initial triage flags high velocity transfers."
    )
    new_case = case_service.create_case(case_in, db, author="analyst_priya")
    assert new_case.status == "NEW"
    assert len(new_case.notes) == 1

    # 2. Valid transition: NEW -> UNDER_REVIEW
    updated = case_service.update_case(new_case.case_id, CaseUpdate(status="UNDER_REVIEW"), db)
    assert updated.status == "UNDER_REVIEW"

    # 3. Valid transition: UNDER_REVIEW -> ESCALATED
    updated2 = case_service.update_case(new_case.case_id, CaseUpdate(status="ESCALATED"), db)
    assert updated2.status == "ESCALATED"

    # 4. Invalid transition: ESCALATED -> CLOSED_FALSE_POSITIVE (not allowed directly)
    with pytest.raises(Exception):
        case_service.update_case(new_case.case_id, CaseUpdate(status="CLOSED_FALSE_POSITIVE"), db)

    # 5. Check Audit log entries
    logs = db.query(AuditLog).filter(AuditLog.entity_id == new_case.case_id).all()
    assert len(logs) >= 2
    db.close()

def test_api_list_transactions_and_overview():
    # Overview
    res = client.get("/api/v1/stats/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_transactions"] > 0
    assert data["total_volume_inr"] > 0

    # Transaction list
    t_res = client.get("/api/v1/transactions")
    assert t_res.status_code == 200
    t_data = t_res.json()
    assert t_data["total"] > 0
    assert len(t_data["items"]) > 0

def test_evaluation_run_endpoint():
    res = client.get("/api/v1/evaluation/run")
    assert res.status_code == 200
    data = res.json()
    assert "confusion_matrix" in data
    assert data["accuracy"] > 0.5
    assert data["sample_size"] > 0

def test_api_hero_endpoint():
    res = client.get("/hero")
    assert res.status_code == 200
    assert "TraceNet" in res.text
    assert "Circular transfer flagged" in res.text
    assert "hero-loop" in res.text or "loop" in res.text
