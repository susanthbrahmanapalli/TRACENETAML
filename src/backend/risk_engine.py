"""
Explainable Risk Engine for TraceNet
Evaluates 7 distinct rules combining transaction-level metrics, historical account baselines,
and network graph topology.
Produces transparent risk scores (0-100), human-readable evidence, and alert triggers.
"""
from datetime import datetime, timedelta, timezone
import json
import uuid
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.backend.models import Transaction, Account, RiskAssessment, Alert, AuditLog
from src.backend.schemas import RuleEvidenceItem
from src.backend.graph_engine import graph_engine, GraphIntelligenceEngine
from src.backend.config import settings

class RiskEngine:
    def __init__(self, ruleset_version: str = "1.0.0"):
        self.ruleset_version = ruleset_version

    def assess_transaction(self, txn: Transaction, db: Session, graph: GraphIntelligenceEngine | None = None) -> tuple[RiskAssessment, Alert | None]:
        """
        Evaluate all 7 rules on a transaction and return persisted RiskAssessment and optional Alert.
        """
        if graph is None:
            graph = graph_engine

        triggered_items: list[RuleEvidenceItem] = []
        sender_id = txn.sender_account_id
        receiver_id = txn.receiver_account_id
        txn_time = txn.timestamp

        # -------------------------------------------------------------
        # Rule 1: R01_VELOCITY_SPIKE
        # Outgoing count >= 5 OR volume >= ₹5,00,000 within 15 minutes
        # -------------------------------------------------------------
        window_start_15m = txn_time - timedelta(minutes=15)
        recent_sender_txns = db.query(Transaction).filter(
            Transaction.sender_account_id == sender_id,
            Transaction.timestamp >= window_start_15m,
            Transaction.timestamp <= txn_time,
            Transaction.status == "COMPLETED"
        ).all()
        
        velocity_count = len(recent_sender_txns)
        velocity_volume = sum(t.amount for t in recent_sender_txns)
        
        if velocity_count >= 5 or velocity_volume >= 500000.0:
            triggered_items.append(RuleEvidenceItem(
                rule_id="R01_VELOCITY_SPIKE",
                rule_name="Transaction Velocity Surge",
                weight=25.0,
                description=f"High frequency outgoing burst: {velocity_count} transfers totaling ₹{velocity_volume:,.2f} in 15 minutes.",
                evidence={
                    "window_minutes": 15,
                    "transaction_count": velocity_count,
                    "threshold_count": 5,
                    "window_volume_inr": velocity_volume,
                    "threshold_volume_inr": 500000.0
                }
            ))

        # -------------------------------------------------------------
        # Rule 2: R02_AMOUNT_DEVIATION
        # Amount > mean + 3.0 * std (baseline min 3 txns) and >= ₹2,00,000
        # -------------------------------------------------------------
        window_start_30d = txn_time - timedelta(days=30)
        hist_txns = db.query(Transaction.amount).filter(
            Transaction.sender_account_id == sender_id,
            Transaction.timestamp >= window_start_30d,
            Transaction.timestamp < txn_time,
            Transaction.status == "COMPLETED"
        ).all()
        
        if len(hist_txns) >= 3 and txn.amount >= 200000.0:
            amounts = [h[0] for h in hist_txns]
            mean_amt = float(np.mean(amounts))
            std_amt = float(np.std(amounts)) if float(np.std(amounts)) > 0 else 1.0
            z_score = (txn.amount - mean_amt) / std_amt
            if z_score >= 3.0:
                triggered_items.append(RuleEvidenceItem(
                    rule_id="R02_AMOUNT_DEVIATION",
                    rule_name="Baseline Amount Deviation",
                    weight=20.0,
                    description=f"Transfer amount ₹{txn.amount:,.2f} is {z_score:.1f}σ above historical 30-day mean of ₹{mean_amt:,.2f}.",
                    evidence={
                        "amount_inr": txn.amount,
                        "mean_inr": round(mean_amt, 2),
                        "std_inr": round(std_amt, 2),
                        "z_score": round(z_score, 2),
                        "baseline_sample_size": len(amounts)
                    }
                ))

        # -------------------------------------------------------------
        # Rule 3: R03_RAPID_PASS_THROUGH
        # Received >= ₹1,00,000, transferred >= 85% within <= 30 mins
        # -------------------------------------------------------------
        pass_through_info = graph.check_rapid_onward_flow(sender_id, txn, window_minutes=30, pass_through_ratio=0.85)
        if pass_through_info:
            triggered_items.append(RuleEvidenceItem(
                rule_id="R03_RAPID_PASS_THROUGH",
                rule_name="Rapid Onward Pass-Through / Layering",
                weight=30.0,
                description=f"Account forwarded {pass_through_info['pass_through_ratio']*100:.0f}% of ₹{pass_through_info['incoming_amount_inr']:,.2f} received {pass_through_info['delta_minutes']:.1f} mins prior.",
                evidence=pass_through_info
            ))

        # -------------------------------------------------------------
        # Rule 4: R04_COUNTERPARTY_SURGE
        # Sent to >= 6 distinct novel counterparties within 24 hours
        # -------------------------------------------------------------
        window_start_24h = txn_time - timedelta(hours=24)
        recent_24h_txns = db.query(Transaction.receiver_account_id).filter(
            Transaction.sender_account_id == sender_id,
            Transaction.timestamp >= window_start_24h,
            Transaction.timestamp <= txn_time,
            Transaction.status == "COMPLETED"
        ).all()
        
        recent_counterparties = set(r[0] for r in recent_24h_txns)
        if len(recent_counterparties) >= 6:
            # Check historical counterparties prior to 24h
            prior_counterparties = set(r[0] for r in db.query(Transaction.receiver_account_id).filter(
                Transaction.sender_account_id == sender_id,
                Transaction.timestamp < window_start_24h,
                Transaction.status == "COMPLETED"
            ).all())
            
            novel_count = len(recent_counterparties - prior_counterparties)
            if novel_count >= 5:
                triggered_items.append(RuleEvidenceItem(
                    rule_id="R04_COUNTERPARTY_SURGE",
                    rule_name="Counterparty Diversity Surge",
                    weight=20.0,
                    description=f"Burst of transfers to {novel_count} novel recipient accounts in 24 hours.",
                    evidence={
                        "recent_counterparties_count": len(recent_counterparties),
                        "novel_counterparties_count": novel_count,
                        "threshold": 5
                    }
                ))

        # -------------------------------------------------------------
        # Rule 5: R05_FAN_IN_SMURFING
        # Inbound distinct senders to receiver >= 4 in 2h AND total >= ₹3,00,000
        # -------------------------------------------------------------
        window_start_2h = txn_time - timedelta(hours=2)
        inbound_txns = db.query(Transaction).filter(
            Transaction.receiver_account_id == receiver_id,
            Transaction.timestamp >= window_start_2h,
            Transaction.timestamp <= txn_time,
            Transaction.status == "COMPLETED"
        ).all()
        
        unique_senders = set(t.sender_account_id for t in inbound_txns)
        total_inflow = sum(t.amount for t in inbound_txns)
        
        if len(unique_senders) >= 4 and total_inflow >= 300000.0:
            triggered_items.append(RuleEvidenceItem(
                rule_id="R05_FAN_IN_SMURFING",
                rule_name="Fan-In Smurfing / Mule Aggregation",
                weight=35.0,
                description=f"Smurfing aggregation: {len(unique_senders)} disparate accounts channeled ₹{total_inflow:,.2f} into {receiver_id} in 2 hours.",
                evidence={
                    "receiver_account_id": receiver_id,
                    "unique_senders_count": len(unique_senders),
                    "total_inflow_inr": round(total_inflow, 2),
                    "threshold_senders": 4,
                    "threshold_amount_inr": 300000.0
                }
            ))

        # -------------------------------------------------------------
        # Rule 6: R06_CIRCULAR_TRANSFER
        # Graph cycle detection (A -> B -> C -> A)
        # -------------------------------------------------------------
        cycles = graph.check_circular_path_for_account(sender_id, max_hops=5)
        if cycles:
            top_cycle = cycles[0]
            triggered_items.append(RuleEvidenceItem(
                rule_id="R06_CIRCULAR_TRANSFER",
                rule_name="Circular Layering Loop",
                weight=40.0,
                description=f"Account is part of an active {top_cycle['length']}-hop circular fund flow loop totaling ₹{top_cycle['total_amount']:,.2f}.",
                evidence=top_cycle
            ))

        # -------------------------------------------------------------
        # Rule 7: R07_DORMANT_SPIKE
        # Inactivity > 90 days and transfer amount >= ₹2,50,000
        # -------------------------------------------------------------
        last_txn = db.query(Transaction).filter(
            Transaction.sender_account_id == sender_id,
            Transaction.timestamp < txn_time,
            Transaction.status == "COMPLETED"
        ).order_by(Transaction.timestamp.desc()).first()
        
        if last_txn:
            days_inactive = (txn_time - last_txn.timestamp).total_seconds() / 86400.0
            if days_inactive > 90.0 and txn.amount >= 250000.0:
                triggered_items.append(RuleEvidenceItem(
                    rule_id="R07_DORMANT_SPIKE",
                    rule_name="Dormant Account Reactivation",
                    weight=25.0,
                    description=f"Account dormant for {int(days_inactive)} days suddenly transferred ₹{txn.amount:,.2f}.",
                    evidence={
                        "days_inactive": round(days_inactive, 1),
                        "last_active_date": last_txn.timestamp.isoformat(),
                        "amount_inr": txn.amount,
                        "threshold_days": 90.0
                    }
                ))

        # -------------------------------------------------------------
        # Score Composition & Priority Assignment
        # -------------------------------------------------------------
        raw_score = sum(item.weight for item in triggered_items)
        # Cap score to [0.0, 100.0]
        final_score = min(100.0, round(raw_score, 1))

        if final_score >= settings.CRITICAL_RISK_THRESHOLD:
            priority = "CRITICAL"
        elif final_score >= settings.HIGH_RISK_THRESHOLD:
            priority = "HIGH"
        elif final_score >= settings.DEFAULT_RISK_THRESHOLD:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        triggered_rule_ids = [item.rule_id for item in triggered_items]
        evidence_dict = {
            "triggered_rules_count": len(triggered_items),
            "breakdown": [item.model_dump() for item in triggered_items],
            "evaluated_at": txn_time.isoformat()
        }

        assessment_id = f"ASM-{uuid.uuid4().hex[:12].upper()}"
        assessment = RiskAssessment(
            assessment_id=assessment_id,
            transaction_id=txn.transaction_id,
            account_id=sender_id,
            score=final_score,
            risk_priority=priority,
            triggered_rules=json.dumps(triggered_rule_ids),
            evidence_data=json.dumps(evidence_dict),
            ruleset_version=self.ruleset_version,
            evaluated_at=datetime.now(timezone.utc)
        )
        db.add(assessment)

        # -------------------------------------------------------------
        # Alert Generation
        # -------------------------------------------------------------
        alert = None
        if final_score >= settings.DEFAULT_RISK_THRESHOLD:
            rule_titles = ", ".join([item.rule_name for item in triggered_items])
            alert_id = f"ALT-{uuid.uuid4().hex[:12].upper()}"
            alert = Alert(
                alert_id=alert_id,
                transaction_id=txn.transaction_id,
                assessment_id=assessment_id,
                account_id=sender_id,
                counterparty_id=receiver_id,
                amount=txn.amount,
                priority=priority,
                risk_score=final_score,
                status="OPEN",
                title=f"Flagged {priority} Risk on {sender_id}: {rule_titles}",
                evidence_summary=json.dumps(evidence_dict),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(alert)
            
            # Audit log for alert trigger
            audit = AuditLog(
                audit_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
                entity_type="ALERT",
                entity_id=alert_id,
                action="ALERT_TRIGGER",
                actor="RISK_ENGINE",
                description=f"System generated {priority} alert for {sender_id} (Score: {final_score})",
                timestamp=datetime.now(timezone.utc)
            )
            db.add(audit)

        db.commit()
        db.refresh(assessment)
        if alert:
            db.refresh(alert)

        return assessment, alert

risk_engine = RiskEngine()
