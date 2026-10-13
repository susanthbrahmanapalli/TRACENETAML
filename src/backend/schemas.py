"""
Pydantic v2 Schemas for TraceNet API Contracts
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Authentication Schemas ---
class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = "ANALYST_L2"

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str
    username: str
    email: str
    full_name: str
    role: str

class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: UserRead

# --- Transaction Schemas ---
class TransactionBase(BaseModel):
    sender_account_id: str
    receiver_account_id: str
    amount: float = Field(..., gt=0, description="Amount in INR (₹)")
    currency: str = "INR"
    timestamp: datetime
    transaction_type: str = "TRANSFER"
    status: str = "COMPLETED"
    channel: str = "UPI"
    description: Optional[str] = None
    ground_truth_label: Optional[str] = None
    scenario_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    transaction_id: str

class TransactionRead(TransactionBase):
    model_config = ConfigDict(from_attributes=True)
    transaction_id: str
    created_at: datetime
    risk_score: Optional[float] = None
    risk_priority: Optional[str] = None

class TransactionImportReport(BaseModel):
    total_processed: int
    accepted: int
    rejected: int
    duplicates: int
    rejection_details: list[dict[str, Any]] = []

# --- Account Schemas ---
class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    account_id: str
    account_name: str
    account_type: str
    kyc_status: str
    risk_score: float
    is_flagged: bool
    created_at: datetime

# --- Risk Assessment Schemas ---
class RuleEvidenceItem(BaseModel):
    rule_id: str
    rule_name: str
    weight: float
    description: str
    evidence: dict[str, Any]

class RiskAssessmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    assessment_id: str
    transaction_id: Optional[str]
    account_id: str
    score: float
    risk_priority: str
    triggered_rules: list[str]
    evidence_data: dict[str, Any]
    ruleset_version: str
    limitations_notes: Optional[str] = None
    evaluated_at: datetime

# --- Alert Schemas ---
class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    alert_id: str
    transaction_id: Optional[str]
    assessment_id: Optional[str]
    account_id: str
    counterparty_id: Optional[str]
    amount: float
    priority: str
    risk_score: float
    status: str
    title: str
    evidence_summary: dict[str, Any]
    case_id: Optional[str]
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime

class AlertStatusUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None

# --- Case Schemas ---
class CaseNoteCreate(BaseModel):
    content: str

class CaseNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    note_id: str
    case_id: str
    author: str
    content: str
    created_at: datetime

class CaseCreate(BaseModel):
    title: str
    priority: str = "MEDIUM"
    primary_account_id: Optional[str] = None
    alert_ids: list[str] = []
    initial_note: Optional[str] = None

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_analyst: Optional[str] = None
    resolution_rationale: Optional[str] = None

class CaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    case_id: str
    case_reference: str
    title: str
    status: str
    priority: str
    primary_account_id: Optional[str]
    assigned_analyst: Optional[str]
    resolution_rationale: Optional[str]
    created_at: datetime
    updated_at: datetime
    alerts: list[AlertRead] = []
    notes: list[CaseNoteRead] = []

# --- Audit Schemas ---
class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    audit_id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    before_state: Optional[dict[str, Any]] = None
    after_state: Optional[dict[str, Any]] = None
    description: str
    timestamp: datetime

# --- Graph Schemas ---
class GraphNode(BaseModel):
    id: str
    label: str
    account_type: str
    risk_score: float
    total_inflow: float
    total_outflow: float
    degree: int
    is_focal: bool = False
    is_flagged: bool = False

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    amount: float
    currency: str = "INR"
    channel: str
    timestamp: datetime
    transaction_id: str
    is_part_of_cycle: bool = False

class CyclePath(BaseModel):
    path: list[str]
    length: int
    total_amount: float
    duration_hours: float
    transaction_ids: list[str]

class GraphNetworkResponse(BaseModel):
    focal_account_id: Optional[str]
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    detected_cycles: list[CyclePath] = []
    total_nodes: int
    total_edges: int

# --- Evaluation Lab Schemas ---
class EvaluationMetricCard(BaseModel):
    name: str
    value: float
    description: str

class ConfusionMatrix(BaseModel):
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int

class EvaluationResponse(BaseModel):
    dataset_name: str
    sample_size: int
    positive_class_count: int
    negative_class_count: int
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    false_positive_rate: float
    latency_ms_per_txn: float
    confusion_matrix: ConfusionMatrix
    baseline_comparison: dict[str, Any]
    eval_timestamp: datetime

# --- Overview Dashboard Stats ---
class OverviewStats(BaseModel):
    total_transactions: int
    total_volume_inr: float
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    medium_alerts: int
    open_cases: int
    resolved_cases: int
    recent_transactions: list[TransactionRead] = []
    top_flagged_accounts: list[AccountRead] = []
