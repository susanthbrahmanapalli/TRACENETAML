"""
Transaction Ingestion Service
Handles CSV batch imports, canonical field normalization, idempotency,
validation failure reporting, and orchestrates risk scoring & graph updates.
"""
from datetime import datetime, timezone
import io
import uuid
import pandas as pd
from dateutil import parser as date_parser
from sqlalchemy.orm import Session

from src.backend.models import Transaction, Account, AuditLog
from src.backend.schemas import TransactionImportReport
from src.backend.risk_engine import risk_engine
from src.backend.graph_engine import graph_engine

COLUMN_ALIASES = {
    "transaction_id": ["transaction_id", "tx_id", "txn_id", "id", "reference_id"],
    "sender_account_id": ["sender_account_id", "from_account", "sender", "sender_id", "source_account"],
    "receiver_account_id": ["receiver_account_id", "to_account", "receiver", "receiver_id", "destination_account"],
    "amount": ["amount", "val", "value", "txn_amount", "transfer_amount"],
    "currency": ["currency", "curr", "currency_code"],
    "timestamp": ["timestamp", "txn_timestamp", "date", "datetime", "time"],
    "transaction_type": ["transaction_type", "type", "tx_type"],
    "status": ["status", "txn_status", "state"],
    "channel": ["channel", "payment_channel", "payment_method", "mode"],
    "description": ["description", "narration", "memo", "remarks"]
}

class IngestionService:
    @staticmethod
    def normalize_column_name(col: str) -> str:
        col_clean = col.strip().lower().replace(" ", "_")
        for canonical, aliases in COLUMN_ALIASES.items():
            if col_clean in aliases:
                return canonical
        return col_clean

    def parse_and_import_csv(self, file_content: bytes, db: Session, current_user: str = "SYSTEM") -> TransactionImportReport:
        """
        Parse CSV content, validate rows, check idempotency, and ingest.
        """
        df = pd.read_csv(io.BytesIO(file_content))
        # Rename columns based on aliases
        df.rename(columns={c: self.normalize_column_name(c) for c in df.columns}, inplace=True)
        
        report = TransactionImportReport(
            total_processed=len(df),
            accepted=0,
            rejected=0,
            duplicates=0,
            rejection_details=[]
        )

        for idx, row in df.iterrows():
            row_num = idx + 2 # 1-based + header
            
            # 1. Required fields check
            txn_id = str(row.get("transaction_id", "")).strip() if pd.notna(row.get("transaction_id")) else ""
            sender = str(row.get("sender_account_id", "")).strip() if pd.notna(row.get("sender_account_id")) else ""
            receiver = str(row.get("receiver_account_id", "")).strip() if pd.notna(row.get("receiver_account_id")) else ""
            
            if not txn_id or not sender or not receiver:
                report.rejected += 1
                report.rejection_details.append({
                    "row": row_num,
                    "reason": "Missing required fields (transaction_id, sender_account_id, or receiver_account_id)"
                })
                continue

            # 2. Duplicate / Idempotency check
            existing = db.query(Transaction).filter(Transaction.transaction_id == txn_id).first()
            if existing:
                report.duplicates += 1
                continue

            # 3. Amount validation
            try:
                amt = float(row.get("amount", 0.0))
                if amt <= 0:
                    raise ValueError("Amount must be positive")
            except Exception as e:
                report.rejected += 1
                report.rejection_details.append({"row": row_num, "reason": f"Invalid amount: {str(e)}"})
                continue

            # 4. Timestamp parsing
            try:
                raw_time = row.get("timestamp")
                if pd.isna(raw_time):
                    ts = datetime.now(timezone.utc)
                elif isinstance(raw_time, datetime):
                    ts = raw_time
                else:
                    ts = date_parser.parse(str(raw_time))
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
            except Exception as e:
                report.rejected += 1
                report.rejection_details.append({"row": row_num, "reason": f"Invalid timestamp format: {str(e)}"})
                continue

            # 5. Currency & Channel normalization
            curr = str(row.get("currency", "INR")).strip().upper()
            if not curr:
                curr = "INR"
            channel = str(row.get("channel", "UPI")).strip().upper()
            tx_type = str(row.get("transaction_type", "TRANSFER")).strip().upper()
            status = str(row.get("status", "COMPLETED")).strip().upper()
            desc = str(row.get("description", "")) if pd.notna(row.get("description")) else None
            label = str(row.get("ground_truth_label", "BENIGN")) if pd.notna(row.get("ground_truth_label")) else "BENIGN"
            scenario = str(row.get("scenario_id", "CUSTOM_IMPORT")) if pd.notna(row.get("scenario_id")) else "CUSTOM_IMPORT"

            # Auto-create accounts if they do not exist
            for acc_id in [sender, receiver]:
                if not db.query(Account).filter(Account.account_id == acc_id).first():
                    db.add(Account(
                        account_id=acc_id,
                        account_name=acc_id,
                        account_type="SAVINGS",
                        kyc_status="VERIFIED",
                        risk_score=15.0,
                        created_at=datetime.now(timezone.utc)
                    ))

            new_txn = Transaction(
                transaction_id=txn_id,
                sender_account_id=sender,
                receiver_account_id=receiver,
                amount=amt,
                currency=curr,
                timestamp=ts,
                transaction_type=tx_type,
                status=status,
                channel=channel,
                description=desc,
                ground_truth_label=label,
                scenario_id=scenario,
                created_at=datetime.now(timezone.utc)
            )
            db.add(new_txn)
            db.commit()
            db.refresh(new_txn)

            # Update in-memory graph
            if status == "COMPLETED":
                graph_engine.add_transaction(new_txn)

            # Evaluate through Risk Engine
            risk_engine.assess_transaction(new_txn, db, graph_engine)
            report.accepted += 1

        # Audit log for import
        audit = AuditLog(
            audit_id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
            entity_type="TRANSACTION",
            entity_id=f"BATCH-{uuid.uuid4().hex[:6]}",
            action="IMPORT",
            actor=current_user,
            description=f"Batch imported CSV: {report.accepted} accepted, {report.rejected} rejected, {report.duplicates} duplicates.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(audit)
        db.commit()

        return report

ingestion_service = IngestionService()
