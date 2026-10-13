"""
TraceNet - Real-Time Fraud & AML Risk Orchestration Platform
FastAPI Gateway & API Routers
"""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
import uuid
import random
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from src.backend.config import settings
from src.backend.database import get_db, init_db, SessionLocal
from src.backend.models import Transaction, Account, RiskAssessment, Alert, Case, CaseNote, AuditLog, User
from src.backend.schemas import (
    LoginRequest, LoginResponse, UserRead,
    TransactionRead, TransactionCreate, TransactionImportReport,
    AccountRead, RiskAssessmentRead,
    AlertRead, AlertStatusUpdate,
    CaseRead, CaseCreate, CaseUpdate, CaseNoteRead, CaseNoteCreate,
    AuditLogRead,
    GraphNetworkResponse, CyclePath,
    EvaluationResponse, OverviewStats
)
from src.backend.graph_engine import graph_engine
from src.backend.risk_engine import risk_engine
from src.backend.services.ingest_service import ingestion_service
from src.backend.services.case_service import case_service
from src.backend.services.eval_service import eval_service
from src.backend.data_generator import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB & Graph on startup
    init_db()
    db = SessionLocal()
    try:
        # Seed if empty
        if db.query(Transaction).count() == 0:
            seed_database(db)
        # Load Graph into memory
        graph_engine.load_from_db(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Explainable Real-Time Fraud & AML Risk Orchestration Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permissive for hackathon development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# 1. Health & Overview Stats
# -------------------------------------------------------------
@app.get(f"{settings.API_PREFIX}/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "currency": settings.DEFAULT_CURRENCY,
        "currency_symbol": settings.CURRENCY_SYMBOL,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/hero", response_class=FileResponse)
@app.get("/hero.html", response_class=FileResponse)
def get_hero_page():
    """Serve the standalone 6s animated website hero loop."""
    hero_path = Path("src/frontend/public/hero.html")
    if not hero_path.exists():
        hero_path = Path("src/frontend/dist/hero.html")
    if not hero_path.exists():
        raise HTTPException(status_code=404, detail="Hero showcase page not found")
    return FileResponse(hero_path, media_type="text/html")

@app.get(f"{settings.API_PREFIX}/stats/overview", response_model=OverviewStats)
def get_overview_stats(db: Session = Depends(get_db)):
    total_txns = db.query(Transaction).count()
    vol_res = db.query(func.sum(Transaction.amount)).scalar()
    total_vol = float(vol_res or 0.0)
    
    total_alerts = db.query(Alert).count()
    crit_alerts = db.query(Alert).filter(Alert.priority == "CRITICAL").count()
    high_alerts = db.query(Alert).filter(Alert.priority == "HIGH").count()
    med_alerts = db.query(Alert).filter(Alert.priority == "MEDIUM").count()
    
    open_cases = db.query(Case).filter(Case.status.in_(["NEW", "UNDER_REVIEW", "ESCALATED"])).count()
    res_cases = db.query(Case).filter(Case.status.in_(["CLOSED_RESOLVED", "CLOSED_FALSE_POSITIVE"])).count()

    # Recent transactions
    recent_db_txns = db.query(Transaction).order_by(desc(Transaction.timestamp)).limit(10).all()
    recent_txns = []
    for t in recent_db_txns:
        asm = db.query(RiskAssessment).filter(RiskAssessment.transaction_id == t.transaction_id).first()
        t_read = TransactionRead.model_validate(t)
        if asm:
            t_read.risk_score = asm.score
            t_read.risk_priority = asm.risk_priority
        recent_txns.append(t_read)

    # Top flagged accounts
    flagged_accs = db.query(Account).order_by(desc(Account.risk_score)).limit(5).all()
    top_accounts = [AccountRead.model_validate(a) for a in flagged_accs]

    return OverviewStats(
        total_transactions=total_txns,
        total_volume_inr=round(total_vol, 2),
        total_alerts=total_alerts,
        critical_alerts=crit_alerts,
        high_alerts=high_alerts,
        medium_alerts=med_alerts,
        open_cases=open_cases,
        resolved_cases=res_cases,
        recent_transactions=recent_txns,
        top_flagged_accounts=top_accounts
    )

# -------------------------------------------------------------
# 2. Authentication (Analyst Login)
# -------------------------------------------------------------
@app.post(f"{settings.API_PREFIX}/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        # Create demo user on the fly if needed
        user = User(
            user_id=f"USR-{uuid.uuid4().hex[:6]}",
            username=req.username,
            email=f"{req.username}@tracenet.bank",
            full_name=req.username.replace("_", " ").title(),
            role=req.role or "ANALYST_L2",
            password_hash="demo123"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return LoginResponse(
        token=f"demo-jwt-{uuid.uuid4().hex}",
        token_type="bearer",
        user=UserRead.model_validate(user)
    )

# -------------------------------------------------------------
# 3. Transaction Ingestion & Queries
# -------------------------------------------------------------
@app.post(f"{settings.API_PREFIX}/transactions/import", response_model=TransactionImportReport)
async def import_transactions_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    MAX_SIZE = 10 * 1024 * 1024 # 10MB
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File payload exceeds 10MB upload limit.")
    return ingestion_service.parse_and_import_csv(content, db, current_user="analyst_priya")

@app.post(f"{settings.API_PREFIX}/risk/assess", response_model=dict)
def assess_transaction_risk(payload: dict, db: Session = Depends(get_db)):
    txn_id = payload.get("transaction_id")
    if not txn_id:
        raise HTTPException(status_code=400, detail="Missing required field 'transaction_id'")
    txn = db.query(Transaction).filter(Transaction.transaction_id == txn_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail=f"Transaction '{txn_id}' not found")
    asm, al = risk_engine.assess_transaction(txn, db, graph_engine)
    return {
        "assessment_id": asm.assessment_id,
        "transaction_id": asm.transaction_id,
        "account_id": asm.account_id,
        "score": asm.score,
        "risk_priority": asm.risk_priority,
        "triggered_rules": json.loads(asm.triggered_rules),
        "evidence": json.loads(asm.evidence_data),
        "alert_created": al is not None,
        "evaluated_at": asm.evaluated_at.isoformat()
    }

@app.get(f"{settings.API_PREFIX}/transactions")
def list_transactions(
    search: Optional[str] = None,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Transaction.transaction_id.ilike(search_filter)) |
            (Transaction.sender_account_id.ilike(search_filter)) |
            (Transaction.receiver_account_id.ilike(search_filter)) |
            (Transaction.description.ilike(search_filter))
        )
    if channel:
        query = query.filter(Transaction.channel == channel.upper())
    if status:
        query = query.filter(Transaction.status == status.upper())
    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    total = query.count()
    txns = query.order_by(desc(Transaction.timestamp)).offset(skip).limit(limit).all()

    items = []
    for t in txns:
        asm = db.query(RiskAssessment).filter(RiskAssessment.transaction_id == t.transaction_id).first()
        t_read = TransactionRead.model_validate(t)
        if asm:
            t_read.risk_score = asm.score
            t_read.risk_priority = asm.risk_priority
        items.append(t_read)

    return {"total": total, "items": items, "skip": skip, "limit": limit}

@app.get(f"{settings.API_PREFIX}/transactions/{{transaction_id}}")
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.transaction_id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    asm = db.query(RiskAssessment).filter(RiskAssessment.transaction_id == transaction_id).first()
    t_read = TransactionRead.model_validate(txn)
    assessment_data = None
    if asm:
        t_read.risk_score = asm.score
        t_read.risk_priority = asm.risk_priority
        assessment_data = {
            "assessment_id": asm.assessment_id,
            "score": asm.score,
            "priority": asm.risk_priority,
            "triggered_rules": json.loads(asm.triggered_rules),
            "evidence": json.loads(asm.evidence_data),
            "evaluated_at": asm.evaluated_at.isoformat()
        }

    return {"transaction": t_read, "assessment": assessment_data}

@app.post(f"{settings.API_PREFIX}/transactions", response_model=TransactionRead)
def create_single_transaction(txn_in: TransactionCreate, db: Session = Depends(get_db)):
    existing = db.query(Transaction).filter(Transaction.transaction_id == txn_in.transaction_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Transaction ID already exists.")

    new_txn = Transaction(**txn_in.model_dump())
    db.add(new_txn)
    db.commit()
    db.refresh(new_txn)

    # Update graph
    if new_txn.status == "COMPLETED":
        graph_engine.add_transaction(new_txn)

    # Score
    asm, _ = risk_engine.assess_transaction(new_txn, db, graph_engine)
    res = TransactionRead.model_validate(new_txn)
    res.risk_score = asm.score
    res.risk_priority = asm.risk_priority
    return res

# -------------------------------------------------------------
# 4. Alerts Queue & Management
# -------------------------------------------------------------
@app.get(f"{settings.API_PREFIX}/alerts")
def list_alerts(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if priority:
        query = query.filter(Alert.priority == priority.upper())
    if status:
        query = query.filter(Alert.status == status.upper())

    total = query.count()
    alerts = query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()

    items = []
    for al in alerts:
        items.append({
            "alert_id": al.alert_id,
            "transaction_id": al.transaction_id,
            "assessment_id": al.assessment_id,
            "account_id": al.account_id,
            "counterparty_id": al.counterparty_id,
            "amount": al.amount,
            "priority": al.priority,
            "risk_score": al.risk_score,
            "status": al.status,
            "title": al.title,
            "evidence_summary": json.loads(al.evidence_summary) if al.evidence_summary else {},
            "case_id": al.case_id,
            "assigned_to": al.assigned_to,
            "created_at": al.created_at,
            "updated_at": al.updated_at
        })
    return {"total": total, "items": items, "skip": skip, "limit": limit}

@app.get(f"{settings.API_PREFIX}/alerts/{{alert_id}}")
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    al = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not al:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {
        "alert_id": al.alert_id,
        "transaction_id": al.transaction_id,
        "assessment_id": al.assessment_id,
        "account_id": al.account_id,
        "counterparty_id": al.counterparty_id,
        "amount": al.amount,
        "priority": al.priority,
        "risk_score": al.risk_score,
        "status": al.status,
        "title": al.title,
        "evidence_summary": json.loads(al.evidence_summary) if al.evidence_summary else {},
        "case_id": al.case_id,
        "assigned_to": al.assigned_to,
        "created_at": al.created_at,
        "updated_at": al.updated_at
    }

@app.patch(f"{settings.API_PREFIX}/alerts/{{alert_id}}")
def update_alert(alert_id: str, update_in: AlertStatusUpdate, db: Session = Depends(get_db)):
    al = db.query(Alert).filter(Alert.alert_id == alert_id).first()
    if not al:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    al.status = update_in.status.upper()
    if update_in.assigned_to:
        al.assigned_to = update_in.assigned_to
    al.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Alert updated successfully"}

# -------------------------------------------------------------
# 5. Case Management
# -------------------------------------------------------------
@app.get(f"{settings.API_PREFIX}/cases")
def list_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status.upper())
    if priority:
        query = query.filter(Case.priority == priority.upper())

    total = query.count()
    cases = query.order_by(desc(Case.updated_at)).offset(skip).limit(limit).all()

    items = []
    for c in cases:
        items.append({
            "case_id": c.case_id,
            "case_reference": c.case_reference,
            "title": c.title,
            "status": c.status,
            "priority": c.priority,
            "primary_account_id": c.primary_account_id,
            "assigned_analyst": c.assigned_analyst,
            "resolution_rationale": c.resolution_rationale,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "alerts_count": len(c.alerts),
            "notes_count": len(c.notes)
        })
    return {"total": total, "items": items, "skip": skip, "limit": limit}

@app.post(f"{settings.API_PREFIX}/cases")
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    c = case_service.create_case(case_in, db, author="analyst_priya")
    return {"case_id": c.case_id, "case_reference": c.case_reference, "status": c.status}

@app.get(f"{settings.API_PREFIX}/cases/{{case_id}}")
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.case_id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    linked_alerts = []
    for al in c.alerts:
        linked_alerts.append({
            "alert_id": al.alert_id,
            "transaction_id": al.transaction_id,
            "priority": al.priority,
            "risk_score": al.risk_score,
            "title": al.title,
            "amount": al.amount,
            "evidence_summary": json.loads(al.evidence_summary) if al.evidence_summary else {}
        })

    notes = [
        {"note_id": n.note_id, "author": n.author, "content": n.content, "created_at": n.created_at}
        for n in c.notes
    ]

    return {
        "case_id": c.case_id,
        "case_reference": c.case_reference,
        "title": c.title,
        "status": c.status,
        "priority": c.priority,
        "primary_account_id": c.primary_account_id,
        "assigned_analyst": c.assigned_analyst,
        "resolution_rationale": c.resolution_rationale,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "alerts": linked_alerts,
        "notes": notes
    }

@app.patch(f"{settings.API_PREFIX}/cases/{{case_id}}")
def update_case(case_id: str, update_in: CaseUpdate, db: Session = Depends(get_db)):
    c = case_service.update_case(case_id, update_in, db, author="analyst_priya")
    return {"case_id": c.case_id, "status": c.status, "message": "Case updated successfully"}

@app.post(f"{settings.API_PREFIX}/cases/{{case_id}}/notes")
def add_case_note(case_id: str, note_in: CaseNoteCreate, db: Session = Depends(get_db)):
    note = case_service.add_note(case_id, note_in.content, db, author="analyst_priya")
    return {"note_id": note.note_id, "created_at": note.created_at}

@app.get(f"{settings.API_PREFIX}/cases/{{case_id}}/audit")
def get_case_audit(case_id: str, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).filter(AuditLog.entity_id == case_id).order_by(desc(AuditLog.timestamp)).all()
    return logs

# -------------------------------------------------------------
# 6. Audit Log Explorer
# -------------------------------------------------------------
@app.get(f"{settings.API_PREFIX}/audit")
def list_audit_logs(
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.upper())
    if action:
        query = query.filter(AuditLog.action == action.upper())
    return query.order_by(desc(AuditLog.timestamp)).limit(limit).all()

# -------------------------------------------------------------
# 7. Live Graph Intelligence
# -------------------------------------------------------------
@app.get(f"{settings.API_PREFIX}/graph/network", response_model=GraphNetworkResponse)
def get_graph_network(
    focal_account_id: Optional[str] = None,
    depth: int = Query(2, ge=1, le=4),
    max_nodes: int = Query(50, ge=10, le=100),
    db: Session = Depends(get_db)
):
    # Ensure graph is in sync with DB
    if graph_engine.graph.number_of_nodes() == 0:
        graph_engine.load_from_db(db)
    return graph_engine.get_network(focal_account_id=focal_account_id, depth=depth, max_nodes=max_nodes)

@app.get(f"{settings.API_PREFIX}/graph/cycles")
def get_graph_cycles(db: Session = Depends(get_db)):
    if graph_engine.graph.number_of_nodes() == 0:
        graph_engine.load_from_db(db)
    cycles = graph_engine.detect_subgraph_cycles(graph_engine.graph, max_len=5)
    return {"count": len(cycles), "cycles": cycles}

# -------------------------------------------------------------
# 8. Evaluation Lab
# -------------------------------------------------------------
@app.get(f"{settings.API_PREFIX}/evaluation/run", response_model=EvaluationResponse)
def run_evaluation(db: Session = Depends(get_db)):
    return eval_service.run_benchmark(db)

# -------------------------------------------------------------
# 9. Demo Utilities: Reseed & Live Streaming Feed Simulator
# -------------------------------------------------------------
@app.post(f"{settings.API_PREFIX}/demo/generate")
def reseed_demo_dataset(db: Session = Depends(get_db)):
    # Clear tables
    db.query(AuditLog).delete()
    db.query(CaseNote).delete()
    db.query(Alert).delete()
    db.query(Case).delete()
    db.query(RiskAssessment).delete()
    db.query(Transaction).delete()
    db.query(Account).delete()
    db.commit()

    a_count, t_count = seed_database(db)
    graph_engine.load_from_db(db)
    
    # Assess all seeded transactions
    txns = db.query(Transaction).order_by(Transaction.timestamp).all()
    alert_count = 0
    for t in txns:
        _, al = risk_engine.assess_transaction(t, db, graph_engine)
        if al:
            alert_count += 1

    return {
        "message": "Demo dataset reseeded successfully.",
        "accounts_created": a_count,
        "transactions_created": t_count,
        "alerts_generated": alert_count
    }

@app.post(f"{settings.API_PREFIX}/demo/stream-step")
def simulate_stream_step(db: Session = Depends(get_db)):
    """Simulate a single real-time transaction event arriving in the live feed."""
    accounts = db.query(Account).all()
    if len(accounts) < 2:
        return {"message": "Insufficient accounts to stream"}

    sender = random.choice(accounts)
    receiver = random.choice([a for a in accounts if a.account_id != sender.account_id])
    
    # Randomly select normal vs suspicious burst
    is_burst = random.random() < 0.25
    amount = round(random.uniform(50000.0, 350000.0) if is_burst else random.uniform(800.0, 15000.0), 2)
    channel = random.choice(["UPI", "IMPS", "NEFT"])
    
    now = datetime.now(timezone.utc)
    txn_id = f"STREAM-TX-{uuid.uuid4().hex[:8].upper()}"
    new_txn = Transaction(
        transaction_id=txn_id,
        sender_account_id=sender.account_id,
        receiver_account_id=receiver.account_id,
        amount=amount,
        currency="INR",
        timestamp=now,
        transaction_type="TRANSFER",
        status="COMPLETED",
        channel=channel,
        description=f"Live streaming {channel} transfer",
        ground_truth_label="STREAM_EVENT",
        scenario_id="LIVE_STREAM_SIMULATOR",
        created_at=now
    )
    db.add(new_txn)
    db.commit()
    db.refresh(new_txn)

    graph_engine.add_transaction(new_txn)
    asm, al = risk_engine.assess_transaction(new_txn, db, graph_engine)

    return {
        "transaction_id": txn_id,
        "sender": sender.account_id,
        "receiver": receiver.account_id,
        "amount": amount,
        "channel": channel,
        "risk_score": asm.score,
        "priority": asm.risk_priority,
        "alert_triggered": al is not None
    }
