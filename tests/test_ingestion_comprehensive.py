"""
Comprehensive Edge-Case Tests for Transaction Ingestion & Validation
Covers empty, corrupt, negative, duplicate, self-transfer, and alias mapping CSV files.
"""
import io
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from src.backend.database import Base, get_db
from src.backend.models import Transaction, Account
from src.backend.services.ingest_service import ingestion_service
from src.backend.main import app

@pytest.fixture
def db_session():
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

def test_ingest_empty_csv(db_session):
    report = ingestion_service.parse_and_import_csv(b"", db_session)
    assert report.total_processed == 0
    assert report.accepted == 0
    assert report.rejected == 1
    assert "Empty CSV" in report.rejection_details[0]["reason"]

def test_ingest_malformed_csv(db_session):
    corrupt_bytes = b"\x00\x01\x02\xff\xfe\x00corrupted-binary-content"
    report = ingestion_service.parse_and_import_csv(corrupt_bytes, db_session)
    assert report.accepted == 0
    assert report.rejected >= 1

def test_ingest_valid_csv_with_aliases(db_session):
    csv_content = """tx_id,from_account,to_account,val,curr,date,mode,state
TX-ALIAS-01,ACC-SRC-1,ACC-DEST-1,25000.0,INR,2026-10-12T10:00:00Z,UPI,COMPLETED
TX-ALIAS-02,ACC-SRC-2,ACC-DEST-2,50000.0,INR,2026-10-12T10:05:00Z,IMPS,COMPLETED
"""
    report = ingestion_service.parse_and_import_csv(csv_content.encode('utf-8'), db_session)
    assert report.total_processed == 2
    assert report.accepted == 2
    assert report.rejected == 0
    assert report.duplicates == 0

    t1 = db_session.query(Transaction).filter(Transaction.transaction_id == "TX-ALIAS-01").first()
    assert t1 is not None
    assert t1.amount == 25000.0
    assert t1.channel == "UPI"

def test_ingest_rejects_negative_and_zero_amount(db_session):
    csv_content = """transaction_id,sender_account_id,receiver_account_id,amount,timestamp
TX-NEG-01,ACC-1,ACC-2,-500.0,2026-10-12T10:00:00Z
TX-ZERO-02,ACC-1,ACC-2,0.0,2026-10-12T10:00:00Z
TX-POS-03,ACC-1,ACC-2,1000.0,2026-10-12T10:00:00Z
"""
    report = ingestion_service.parse_and_import_csv(csv_content.encode('utf-8'), db_session)
    assert report.total_processed == 3
    assert report.accepted == 1
    assert report.rejected == 2
    reasons = [r["reason"] for r in report.rejection_details]
    assert any("positive" in r for r in reasons)

def test_ingest_rejects_self_transfers(db_session):
    csv_content = """transaction_id,sender_account_id,receiver_account_id,amount,timestamp
TX-SELF-01,ACC-SAME,ACC-SAME,5000.0,2026-10-12T10:00:00Z
"""
    report = ingestion_service.parse_and_import_csv(csv_content.encode('utf-8'), db_session)
    assert report.accepted == 0
    assert report.rejected == 1
    assert "Self-transfers not permitted" in report.rejection_details[0]["reason"]

def test_ingest_rejects_invalid_status_and_channel(db_session):
    csv_content = """transaction_id,sender_account_id,receiver_account_id,amount,status,channel,timestamp
TX-BAD-STAT,ACC-1,ACC-2,5000.0,BLOCKED_CUSTOM,UPI,2026-10-12T10:00:00Z
TX-BAD-CHAN,ACC-1,ACC-2,5000.0,COMPLETED,BITCOIN,2026-10-12T10:00:00Z
"""
    report = ingestion_service.parse_and_import_csv(csv_content.encode('utf-8'), db_session)
    assert report.accepted == 0
    assert report.rejected == 2

def test_ingest_handles_duplicates_consistently(db_session):
    csv_content = """transaction_id,sender_account_id,receiver_account_id,amount,timestamp
TX-DUP-01,ACC-1,ACC-2,5000.0,2026-10-12T10:00:00Z
TX-DUP-01,ACC-1,ACC-2,5000.0,2026-10-12T10:05:00Z
"""
    report = ingestion_service.parse_and_import_csv(csv_content.encode('utf-8'), db_session)
    assert report.total_processed == 2
    assert report.accepted == 1
    assert report.duplicates == 1

def test_api_upload_file_size_limit():
    client = TestClient(app)
    # 11MB file payload
    oversized = b"a" * (11 * 1024 * 1024)
    res = client.post(
        "/api/v1/transactions/import",
        files={"file": ("large.csv", io.BytesIO(oversized), "text/csv")}
    )
    assert res.status_code == 413
    assert "10MB upload limit" in res.json()["detail"]
