"""
Stress & Reliability Tests for Graph Cycles, Risk Assessment Endpoint, and Case Governance
"""
from datetime import datetime, timedelta, timezone
import pytest
import networkx as nx
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.backend.database import Base, get_db
from src.backend.models import Transaction, Account, Case, Alert
from src.backend.graph_engine import GraphIntelligenceEngine
from src.backend.risk_engine import RiskEngine
from src.backend.services.case_service import case_service
from src.backend.schemas import CaseCreate, CaseUpdate
from src.backend.main import app

@pytest.fixture
def stress_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_graph_cycle_limit_on_dense_clique():
    """Verify that a densely connected network with many cycles terminates safely at bounded limit."""
    engine = GraphIntelligenceEngine()
    # Create complete directed graph on 6 nodes with bidirectional edges
    base_G = nx.complete_graph(6).to_directed()
    G = nx.MultiDiGraph()
    for u, v in base_G.edges():
        G.add_edge(
            u, v, key=f"TX-{u}-{v}",
            transaction_id=f"TX-{u}-{v}",
            amount=50000.0,
            timestamp=datetime.now(timezone.utc),
            channel="UPI",
            currency="INR"
        )

    cycles = engine.detect_subgraph_cycles(G, max_len=5)
    # Must terminate without infinite loop and not exceed MAX_DETECTED_CYCLES = 50
    assert len(cycles) <= 50
    assert len(cycles) > 0

def test_r07_handles_offset_naive_sqlite_datetime(stress_db):
    """Verify R07 does not crash with TypeError when historical txn is timezone-naive."""
    # Insert a transaction with naive datetime simulating SQLite default return
    naive_dt = datetime(2026, 5, 1, 10, 0, 0) # No tzinfo
    old_txn = Transaction(
        transaction_id="TX-NAIVE-OLD",
        sender_account_id="ACC-DORM-NAIVE",
        receiver_account_id="ACC-BENIGN",
        amount=500.0,
        currency="INR",
        timestamp=naive_dt,
        status="COMPLETED"
    )
    stress_db.add(old_txn)
    stress_db.commit()

    # Now evaluate current transaction with timezone-aware UTC datetime
    aware_dt = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    curr_txn = Transaction(
        transaction_id="TX-AWARE-CURR",
        sender_account_id="ACC-DORM-NAIVE",
        receiver_account_id="ACC-TARGET",
        amount=350000.0,
        currency="INR",
        timestamp=aware_dt,
        status="COMPLETED"
    )
    stress_db.add(curr_txn)
    stress_db.commit()

    risk_engine = RiskEngine()
    graph_engine = GraphIntelligenceEngine()
    
    # Must NOT raise TypeError
    asm, al = risk_engine.assess_transaction(curr_txn, stress_db, graph_engine)
    assert "R07_DORMANT_SPIKE" in asm.triggered_rules
    assert asm.score >= 25.0

def test_api_risk_assess_endpoint():
    """Verify POST /api/v1/risk/assess returns valid risk assessment payload."""
    client = TestClient(app)
    # Seed a test transaction first via POST /api/v1/transactions
    txn_id = "TX-ASSESS-TEST-01"
    create_res = client.post("/api/v1/transactions", json={
        "transaction_id": txn_id,
        "sender_account_id": "ACC-TEST-S",
        "receiver_account_id": "ACC-TEST-R",
        "amount": 75000.0,
        "currency": "INR",
        "timestamp": "2026-10-13T10:00:00Z",
        "channel": "UPI",
        "status": "COMPLETED"
    })
    assert create_res.status_code in (200, 409)

    # Call /api/v1/risk/assess
    assess_res = client.post("/api/v1/risk/assess", json={"transaction_id": txn_id})
    assert assess_res.status_code == 200
    data = assess_res.json()
    assert "score" in data
    assert "risk_priority" in data
    assert "evidence" in data
    assert data["transaction_id"] == txn_id

def test_case_alert_linking_and_unlinking(stress_db):
    """Test linking new alerts and unlinking alerts on an active case."""
    # Create 2 alerts
    al1 = Alert(
        alert_id="ALT-LINK-01",
        account_id="ACC-1",
        priority="HIGH",
        risk_score=80.0,
        status="OPEN",
        title="Alert 1"
    )
    al2 = Alert(
        alert_id="ALT-LINK-02",
        account_id="ACC-1",
        priority="HIGH",
        risk_score=85.0,
        status="OPEN",
        title="Alert 2"
    )
    stress_db.add_all([al1, al2])
    stress_db.commit()

    # Create case with al1
    new_case = case_service.create_case(
        CaseCreate(title="Test Link Case", priority="HIGH", alert_ids=["ALT-LINK-01"]),
        stress_db
    )
    assert len(new_case.alerts) == 1
    assert al1.status == "INVESTIGATING"

    # Link al2 to the case
    updated = case_service.update_case(
        new_case.case_id,
        CaseUpdate(link_alert_ids=["ALT-LINK-02"]),
        stress_db
    )
    stress_db.refresh(al2)
    assert al2.case_id == new_case.case_id
    assert al2.status == "INVESTIGATING"

    # Unlink al1 from the case
    updated2 = case_service.update_case(
        new_case.case_id,
        CaseUpdate(unlink_alert_ids=["ALT-LINK-01"]),
        stress_db
    )
    stress_db.refresh(al1)
    assert al1.case_id is None
    assert al1.status == "OPEN"

def test_case_closure_requires_resolution_rationale(stress_db):
    """Verify that closing a case without rationale is rejected."""
    c = case_service.create_case(
        CaseCreate(title="Rationale Test Case", priority="MEDIUM"),
        stress_db
    )
    # Move to UNDER_REVIEW
    case_service.update_case(c.case_id, CaseUpdate(status="UNDER_REVIEW"), stress_db)

    # Attempt closing without rationale -> must raise exception
    with pytest.raises(Exception) as excinfo:
        case_service.update_case(c.case_id, CaseUpdate(status="CLOSED_RESOLVED"), stress_db)
    assert "mandatory" in str(excinfo.value)

    # Close with valid rationale -> succeeds
    closed = case_service.update_case(
        c.case_id,
        CaseUpdate(status="CLOSED_RESOLVED", resolution_rationale="Verified legitimate business supplier payments via GST invoice #8841."),
        stress_db
    )
    assert closed.status == "CLOSED_RESOLVED"
    assert closed.resolution_rationale is not None
