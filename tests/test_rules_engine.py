"""
Deterministic Unit Tests for 7 Explainable Risk Rules
Covers positive triggers and benign counterexamples.
"""
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.backend.database import Base
from src.backend.models import Transaction, Account
from src.backend.risk_engine import RiskEngine
from src.backend.graph_engine import GraphIntelligenceEngine

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def test_graph():
    return GraphIntelligenceEngine()

@pytest.fixture
def risk_eng():
    return RiskEngine()

def test_r01_velocity_spike_triggers(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    # Add 5 transfers in 10 mins
    for i in range(5):
        t = Transaction(
            transaction_id=f"TX-VEL-{i}",
            sender_account_id="ACC-001",
            receiver_account_id=f"ACC-00{i+2}",
            amount=50000.0,
            currency="INR",
            timestamp=now - timedelta(minutes=10 - i),
            status="COMPLETED"
        )
        test_db.add(t)
    test_db.commit()

    # 6th transfer
    curr_txn = Transaction(
        transaction_id="TX-VEL-CURR",
        sender_account_id="ACC-001",
        receiver_account_id="ACC-099",
        amount=50000.0,
        currency="INR",
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(curr_txn)
    test_db.commit()

    asm, _ = risk_eng.assess_transaction(curr_txn, test_db, test_graph)
    assert "R01_VELOCITY_SPIKE" in asm.triggered_rules
    assert asm.score >= 25.0

def test_r01_velocity_normal_cadence_passes(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    # Only 1 transfer 3 hours ago
    t = Transaction(
        transaction_id="TX-NORM-1",
        sender_account_id="ACC-002",
        receiver_account_id="ACC-003",
        amount=5000.0,
        currency="INR",
        timestamp=now - timedelta(hours=3),
        status="COMPLETED"
    )
    test_db.add(t)
    test_db.commit()

    curr_txn = Transaction(
        transaction_id="TX-NORM-2",
        sender_account_id="ACC-002",
        receiver_account_id="ACC-004",
        amount=7000.0,
        currency="INR",
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(curr_txn)
    test_db.commit()

    asm, alert = risk_eng.assess_transaction(curr_txn, test_db, test_graph)
    assert "R01_VELOCITY_SPIKE" not in asm.triggered_rules
    assert alert is None

def test_r02_amount_deviation_triggers(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    # Baseline transactions averaging ₹10,000
    for i in range(5):
        t = Transaction(
            transaction_id=f"TX-BASE-{i}",
            sender_account_id="ACC-SPIKE",
            receiver_account_id="ACC-MERCH",
            amount=10000.0 + (i * 500),
            currency="INR",
            timestamp=now - timedelta(days=10 - i),
            status="COMPLETED"
        )
        test_db.add(t)
    test_db.commit()

    # Sudden huge transfer ₹8,50,000
    curr_txn = Transaction(
        transaction_id="TX-SPIKE-1",
        sender_account_id="ACC-SPIKE",
        receiver_account_id="ACC-UNKNOWN",
        amount=850000.0,
        currency="INR",
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(curr_txn)
    test_db.commit()

    asm, _ = risk_eng.assess_transaction(curr_txn, test_db, test_graph)
    assert "R02_AMOUNT_DEVIATION" in asm.triggered_rules

def test_r03_rapid_pass_through_triggers(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    # Incoming ₹5,00,000 10 mins ago
    in_txn = Transaction(
        transaction_id="TX-IN-1",
        sender_account_id="ACC-SRC",
        receiver_account_id="ACC-MULE",
        amount=500000.0,
        currency="INR",
        timestamp=now - timedelta(minutes=10),
        status="COMPLETED"
    )
    test_db.add(in_txn)
    test_db.commit()
    test_graph.add_transaction(in_txn)

    # Immediate outgoing ₹4,80,000 (96% pass-through)
    out_txn = Transaction(
        transaction_id="TX-OUT-1",
        sender_account_id="ACC-MULE",
        receiver_account_id="ACC-DEST",
        amount=480000.0,
        currency="INR",
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(out_txn)
    test_db.commit()

    asm, _ = risk_eng.assess_transaction(out_txn, test_db, test_graph)
    assert "R03_RAPID_PASS_THROUGH" in asm.triggered_rules

def test_r05_fan_in_smurfing_triggers(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    # 4 distinct senders channeling ₹80,000 each into ACC-COLLECTOR
    for i in range(4):
        t = Transaction(
            transaction_id=f"TX-SMURF-{i}",
            sender_account_id=f"ACC-SENDER-{i}",
            receiver_account_id="ACC-COLLECTOR",
            amount=80000.0,
            currency="INR",
            timestamp=now - timedelta(minutes=30 - i*5),
            status="COMPLETED"
        )
        test_db.add(t)
    test_db.commit()

    curr_txn = Transaction(
        transaction_id="TX-SMURF-FINAL",
        sender_account_id="ACC-SENDER-99",
        receiver_account_id="ACC-COLLECTOR",
        amount=80000.0,
        currency="INR",
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(curr_txn)
    test_db.commit()

    asm, _ = risk_eng.assess_transaction(curr_txn, test_db, test_graph)
    assert "R05_FAN_IN_SMURFING" in asm.triggered_rules

def test_r06_circular_transfer_triggers(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    t1 = Transaction(transaction_id="TX-C1", sender_account_id="ACC-A", receiver_account_id="ACC-B", amount=150000.0, timestamp=now - timedelta(minutes=30), status="COMPLETED")
    t2 = Transaction(transaction_id="TX-C2", sender_account_id="ACC-B", receiver_account_id="ACC-C", amount=150000.0, timestamp=now - timedelta(minutes=20), status="COMPLETED")
    t3 = Transaction(transaction_id="TX-C3", sender_account_id="ACC-C", receiver_account_id="ACC-A", amount=150000.0, timestamp=now - timedelta(minutes=10), status="COMPLETED")
    
    for t in [t1, t2, t3]:
        test_db.add(t)
        test_graph.add_transaction(t)
    test_db.commit()

    curr_txn = Transaction(
        transaction_id="TX-C4",
        sender_account_id="ACC-A",
        receiver_account_id="ACC-B",
        amount=150000.0,
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(curr_txn)
    test_db.commit()

    asm, _ = risk_eng.assess_transaction(curr_txn, test_db, test_graph)
    assert "R06_CIRCULAR_TRANSFER" in asm.triggered_rules

def test_r07_dormant_spike_triggers(test_db, test_graph, risk_eng):
    now = datetime(2026, 10, 13, 10, 0, 0, tzinfo=timezone.utc)
    # Old activity 110 days ago
    old_txn = Transaction(
        transaction_id="TX-OLD-1",
        sender_account_id="ACC-SLEEP",
        receiver_account_id="ACC-OTHER",
        amount=1000.0,
        currency="INR",
        timestamp=now - timedelta(days=110),
        status="COMPLETED"
    )
    test_db.add(old_txn)
    test_db.commit()

    # Sudden high value transfer ₹3,50,000
    curr_txn = Transaction(
        transaction_id="TX-WAKE-1",
        sender_account_id="ACC-SLEEP",
        receiver_account_id="ACC-DEST",
        amount=350000.0,
        currency="INR",
        timestamp=now,
        status="COMPLETED"
    )
    test_db.add(curr_txn)
    test_db.commit()

    asm, _ = risk_eng.assess_transaction(curr_txn, test_db, test_graph)
    assert "R07_DORMANT_SPIKE" in asm.triggered_rules
