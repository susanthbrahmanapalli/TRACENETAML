"""
Evaluation Lab Benchmark Service
Computes quantitative classification metrics (Precision, Recall, F1, FPR, Confusion Matrix, Latency)
comparing TraceNet's multi-signal engine against ground-truth labels and a naive baseline.
"""
from datetime import datetime, timezone
import time
from sqlalchemy.orm import Session

from src.backend.models import Transaction, RiskAssessment
from src.backend.schemas import EvaluationResponse, ConfusionMatrix
from src.backend.risk_engine import risk_engine
from src.backend.graph_engine import graph_engine
from src.backend.config import settings

class EvaluationService:
    def run_benchmark(self, db: Session) -> EvaluationResponse:
        """
        Evaluate all transactions with ground_truth_label in database.
        """
        txns = db.query(Transaction).filter(Transaction.ground_truth_label.isnot(None)).all()
        if not txns:
            # Return empty response if no labelled data
            return EvaluationResponse(
                dataset_name="TraceNet Synthetic Indian Banking Benchmark v1",
                sample_size=0,
                positive_class_count=0,
                negative_class_count=0,
                accuracy=0.0,
                precision=0.0,
                recall=0.0,
                f1_score=0.0,
                false_positive_rate=0.0,
                latency_ms_per_txn=0.0,
                confusion_matrix=ConfusionMatrix(true_positives=0, false_positives=0, true_negatives=0, false_negatives=0),
                baseline_comparison={},
                eval_timestamp=datetime.now(timezone.utc)
            )

        tp = 0
        fp = 0
        tn = 0
        fn = 0
        
        # Naive baseline counters (flag if amount >= ₹3,00,000)
        naive_tp = 0
        naive_fp = 0
        naive_tn = 0
        naive_fn = 0

        start_time = time.perf_counter()

        for t in txns:
            is_ground_truth_suspicious = (t.ground_truth_label != "BENIGN")

            # Check if TraceNet flagged this transaction
            # Look up existing assessment or evaluate
            assessment = db.query(RiskAssessment).filter(RiskAssessment.transaction_id == t.transaction_id).first()
            if not assessment:
                assessment, _ = risk_engine.assess_transaction(t, db, graph_engine)

            is_tracenet_flagged = (assessment.score >= settings.DEFAULT_RISK_THRESHOLD)

            if is_ground_truth_suspicious and is_tracenet_flagged:
                tp += 1
            elif not is_ground_truth_suspicious and is_tracenet_flagged:
                fp += 1
            elif not is_ground_truth_suspicious and not is_tracenet_flagged:
                tn += 1
            elif is_ground_truth_suspicious and not is_tracenet_flagged:
                fn += 1

            # Naive baseline comparison: purely flag amount >= ₹3,00,000
            is_naive_flagged = (t.amount >= 300000.0)
            if is_ground_truth_suspicious and is_naive_flagged:
                naive_tp += 1
            elif not is_ground_truth_suspicious and is_naive_flagged:
                naive_fp += 1
            elif not is_ground_truth_suspicious and not is_naive_flagged:
                naive_tn += 1
            elif is_ground_truth_suspicious and not is_naive_flagged:
                naive_fn += 1

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        latency_per_txn = round(elapsed_ms / max(len(txns), 1), 2)

        total = tp + fp + tn + fn
        accuracy = round((tp + tn) / total, 4) if total > 0 else 0.0
        precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
        recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
        f1 = round(2 * (precision * recall) / (precision + recall), 4) if (precision + recall) > 0 else 0.0
        fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0

        # Naive baseline metrics
        naive_prec = round(naive_tp / (naive_tp + naive_fp), 4) if (naive_tp + naive_fp) > 0 else 0.0
        naive_rec = round(naive_tp / (naive_tp + naive_fn), 4) if (naive_tp + naive_fn) > 0 else 0.0
        naive_f1 = round(2 * (naive_prec * naive_rec) / (naive_prec + naive_rec), 4) if (naive_prec + naive_rec) > 0 else 0.0

        baseline_comp = {
            "baseline_model": "Naive Static Amount Threshold (> ₹3,00,000)",
            "baseline_precision": naive_prec,
            "baseline_recall": naive_rec,
            "baseline_f1_score": naive_f1,
            "tracenet_f1_improvement_pct": round(((f1 - naive_f1) / max(naive_f1, 0.01)) * 100, 1),
            "explanation": "TraceNet's topological graph engine and behavioural baselines capture structuring, smurfing, and circular loops that bypass static single-transaction amount thresholds."
        }

        return EvaluationResponse(
            dataset_name="TraceNet Synthetic Indian Banking Benchmark v1",
            sample_size=total,
            positive_class_count=tp + fn,
            negative_class_count=tn + fp,
            accuracy=accuracy,
            precision=precision,
            recall=recall,
            f1_score=f1,
            false_positive_rate=fpr,
            latency_ms_per_txn=latency_per_txn,
            confusion_matrix=ConfusionMatrix(
                true_positives=tp,
                false_positives=fp,
                true_negatives=tn,
                false_negatives=fn
            ),
            baseline_comparison=baseline_comp,
            eval_timestamp=datetime.now(timezone.utc)
        )

eval_service = EvaluationService()
