"""
Case Management & Investigation Lifecycle Service
Implements the compliance investigation state machine with strict transition guards,
alert attachment, analyst notes, and immutable audit logs.
"""
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.backend.models import Case, CaseNote, Alert, AuditLog
from src.backend.schemas import CaseCreate, CaseUpdate

VALID_STATUSES = {
    "NEW",
    "UNDER_REVIEW",
    "ESCALATED",
    "SAR_RECOMMENDED",
    "CLOSED_RESOLVED",
    "CLOSED_FALSE_POSITIVE"
}

ALLOWED_TRANSITIONS = {
    "NEW": {"UNDER_REVIEW", "CLOSED_FALSE_POSITIVE"},
    "UNDER_REVIEW": {"ESCALATED", "SAR_RECOMMENDED", "CLOSED_RESOLVED", "CLOSED_FALSE_POSITIVE"},
    "ESCALATED": {"SAR_RECOMMENDED", "CLOSED_RESOLVED", "UNDER_REVIEW"},
    "SAR_RECOMMENDED": {"CLOSED_RESOLVED", "UNDER_REVIEW"},
    "CLOSED_RESOLVED": {"UNDER_REVIEW"}, # Reopening
    "CLOSED_FALSE_POSITIVE": {"UNDER_REVIEW"} # Reopening
}

class CaseService:
    def create_case(self, case_in: CaseCreate, db: Session, author: str = "analyst_priya") -> Case:
        """Create a new compliance case and link specified alerts."""
        case_id = f"CAS-{uuid.uuid4().hex[:12].upper()}"
        case_ref = f"CASE-IND-2026-{uuid.uuid4().hex[:4].upper()}"
        
        new_case = Case(
            case_id=case_id,
            case_reference=case_ref,
            title=case_in.title,
            status="NEW",
            priority=case_in.priority,
            primary_account_id=case_in.primary_account_id,
            assigned_analyst=author,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(new_case)

        # Link alerts
        if case_in.alert_ids:
            alerts = db.query(Alert).filter(Alert.alert_id.in_(case_in.alert_ids)).all()
            for al in alerts:
                al.case_id = case_id
                al.status = "INVESTIGATING"

        # Initial note if provided
        if case_in.initial_note:
            note = CaseNote(
                note_id=f"NOT-{uuid.uuid4().hex[:12].upper()}",
                case_id=case_id,
                author=author,
                content=case_in.initial_note,
                created_at=datetime.now(timezone.utc)
            )
            db.add(note)

        # Audit log
        audit = AuditLog(
            audit_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
            entity_type="CASE",
            entity_id=case_id,
            action="CREATE",
            actor=author,
            description=f"Created case {case_ref}: '{case_in.title}' with {len(case_in.alert_ids)} linked alerts.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)
        
        db.commit()
        db.refresh(new_case)
        return new_case

    def update_case(self, case_id: str, case_update: CaseUpdate, db: Session, author: str = "analyst_priya") -> Case:
        """Update case status, priority, assignment, or resolution rationale with state machine validation."""
        case = db.query(Case).filter(Case.case_id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        before_state = {
            "status": case.status,
            "priority": case.priority,
            "assigned_analyst": case.assigned_analyst,
            "resolution_rationale": case.resolution_rationale
        }

        # Validate status transition if changing
        if case_update.status and case_update.status != case.status:
            new_status = case_update.status.upper()
            if new_status not in VALID_STATUSES:
                raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'.")
            
            allowed = ALLOWED_TRANSITIONS.get(case.status, set())
            if new_status not in allowed:
                raise HTTPException(
                    status_code=409,
                    detail=f"Illegal state transition from '{case.status}' to '{new_status}'. Allowed: {sorted(list(allowed))}"
                )
            case.status = new_status
            
            # If closing, enforce mandatory resolution rationale
            if new_status in ("CLOSED_RESOLVED", "CLOSED_FALSE_POSITIVE"):
                rationale = (case_update.resolution_rationale or case.resolution_rationale or "").strip()
                if not rationale:
                    raise HTTPException(
                        status_code=400,
                        detail="A non-empty resolution rationale is mandatory when closing a case."
                    )
                case.resolution_rationale = rationale
                alerts = db.query(Alert).filter(Alert.case_id == case_id).all()
                for al in alerts:
                    al.status = "RESOLVED" if new_status == "CLOSED_RESOLVED" else "DISMISSED"

        if case_update.priority:
            case.priority = case_update.priority.upper()

        if case_update.assigned_analyst:
            case.assigned_analyst = case_update.assigned_analyst

        if case_update.resolution_rationale:
            case.resolution_rationale = case_update.resolution_rationale.strip()

        # Link alerts
        if case_update.link_alert_ids:
            alerts_to_link = db.query(Alert).filter(Alert.alert_id.in_(case_update.link_alert_ids)).all()
            for al in alerts_to_link:
                al.case_id = case_id
                al.status = "INVESTIGATING"

        # Unlink alerts
        if case_update.unlink_alert_ids:
            alerts_to_unlink = db.query(Alert).filter(
                Alert.alert_id.in_(case_update.unlink_alert_ids),
                Alert.case_id == case_id
            ).all()
            for al in alerts_to_unlink:
                al.case_id = None
                al.status = "OPEN"

        case.updated_at = datetime.now(timezone.utc)

        after_state = {
            "status": case.status,
            "priority": case.priority,
            "assigned_analyst": case.assigned_analyst,
            "resolution_rationale": case.resolution_rationale,
            "linked_alerts_count": len(case.alerts)
        }

        # Audit log
        audit = AuditLog(
            audit_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
            entity_type="CASE",
            entity_id=case_id,
            action="UPDATE",
            actor=author,
            before_state=str(before_state),
            after_state=str(after_state),
            description=f"Updated case {case.case_reference}: status={case.status}, assigned={case.assigned_analyst}",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)

        db.commit()
        db.refresh(case)
        return case

    def add_note(self, case_id: str, content: str, db: Session, author: str = "analyst_priya") -> CaseNote:
        """Append an investigative note to a case."""
        case = db.query(Case).filter(Case.case_id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        note = CaseNote(
            note_id=f"NOT-{uuid.uuid4().hex[:12].upper()}",
            case_id=case_id,
            author=author,
            content=content,
            created_at=datetime.now(timezone.utc)
        )
        db.add(note)

        audit = AuditLog(
            audit_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
            entity_type="NOTE",
            entity_id=note.note_id,
            action="NOTE_ADD",
            actor=author,
            description=f"Added investigation note to {case.case_reference}",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)

        db.commit()
        db.refresh(note)
        return note

case_service = CaseService()
