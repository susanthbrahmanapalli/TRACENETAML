"""
SQLAlchemy Relational Models for TraceNet
"""
from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, String, Float, DateTime, Boolean, Text, ForeignKey, Integer, Index
)
from sqlalchemy.orm import relationship
from src.backend.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(64), primary_key=True, index=True)
    sender_account_id = Column(String(64), index=True, nullable=False)
    receiver_account_id = Column(String(64), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    timestamp = Column(DateTime(timezone=True), index=True, nullable=False)
    transaction_type = Column(String(32), default="TRANSFER") # TRANSFER, PAYMENT, SETTLEMENT
    status = Column(String(32), default="COMPLETED") # COMPLETED, FAILED, PENDING, REVERSED
    channel = Column(String(32), default="UPI") # UPI, IMPS, NEFT, RTGS, CARD, ATM
    description = Column(String(255), nullable=True)
    
    # Ground-truth evaluation metadata (isolated from feature calculations)
    ground_truth_label = Column(String(64), nullable=True) # BENIGN, SUSPICIOUS_VELOCITY, etc.
    scenario_id = Column(String(64), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    assessments = relationship("RiskAssessment", back_populates="transaction", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="transaction")


class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(String(64), primary_key=True, index=True)
    account_name = Column(String(128), nullable=False)
    account_type = Column(String(32), default="SAVINGS") # SAVINGS, CURRENT, MERCHANT, MULE_SUSPECT
    kyc_status = Column(String(32), default="VERIFIED") # VERIFIED, TIER_1, FLAGGED, PENDING
    risk_score = Column(Float, default=0.0)
    is_flagged = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    assessment_id = Column(String(64), primary_key=True, index=True)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), nullable=True, index=True)
    account_id = Column(String(64), index=True, nullable=False)
    score = Column(Float, nullable=False) # 0.0 - 100.0
    risk_priority = Column(String(16), nullable=False) # CRITICAL, HIGH, MEDIUM, LOW
    triggered_rules = Column(Text, default="[]") # JSON list of rule IDs
    evidence_data = Column(Text, default="{}") # JSON structured metrics
    ruleset_version = Column(String(16), default="1.0.0")
    limitations_notes = Column(Text, nullable=True)
    evaluated_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    transaction = relationship("Transaction", back_populates="assessments")
    alerts = relationship("Alert", back_populates="assessment")


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String(64), primary_key=True, index=True)
    transaction_id = Column(String(64), ForeignKey("transactions.transaction_id"), nullable=True, index=True)
    assessment_id = Column(String(64), ForeignKey("risk_assessments.assessment_id"), nullable=True)
    account_id = Column(String(64), index=True, nullable=False)
    counterparty_id = Column(String(64), nullable=True)
    amount = Column(Float, default=0.0)
    priority = Column(String(16), index=True, nullable=False) # CRITICAL, HIGH, MEDIUM, LOW
    risk_score = Column(Float, nullable=False)
    status = Column(String(32), default="OPEN", index=True) # OPEN, INVESTIGATING, RESOLVED, DISMISSED
    title = Column(String(255), nullable=False)
    evidence_summary = Column(Text, default="{}") # JSON details
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=True, index=True)
    assigned_to = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    transaction = relationship("Transaction", back_populates="alerts")
    assessment = relationship("RiskAssessment", back_populates="alerts")
    case = relationship("Case", back_populates="alerts")


class Case(Base):
    __tablename__ = "cases"

    case_id = Column(String(64), primary_key=True, index=True)
    case_reference = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(32), default="NEW", index=True) # NEW, UNDER_REVIEW, ESCALATED, SAR_RECOMMENDED, CLOSED_RESOLVED, CLOSED_FALSE_POSITIVE
    priority = Column(String(16), default="MEDIUM", index=True)
    primary_account_id = Column(String(64), index=True, nullable=True)
    assigned_analyst = Column(String(64), nullable=True)
    resolution_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    alerts = relationship("Alert", back_populates="case")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan", order_by="CaseNote.created_at.desc()")


class CaseNote(Base):
    __tablename__ = "case_notes"

    note_id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), index=True, nullable=False)
    author = Column(String(64), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    case = relationship("Case", back_populates="notes")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id = Column(String(64), primary_key=True, index=True)
    entity_type = Column(String(32), index=True, nullable=False) # TRANSACTION, ALERT, CASE, NOTE, RULE
    entity_id = Column(String(64), index=True, nullable=False)
    action = Column(String(32), index=True, nullable=False) # IMPORT, ASSESS, CREATE, UPDATE, STATUS_CHANGE, ASSIGN, NOTE_ADD, RESOLVE
    actor = Column(String(64), default="SYSTEM", nullable=False)
    before_state = Column(Text, nullable=True) # JSON snapshot
    after_state = Column(Text, nullable=True) # JSON snapshot
    description = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)


class User(Base):
    __tablename__ = "users"

    user_id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, nullable=False)
    full_name = Column(String(128), nullable=False)
    role = Column(String(32), default="ANALYST_L2") # ANALYST_L1, ANALYST_L2, MLRO, ADMIN
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
