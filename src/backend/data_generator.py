"""
Deterministic Synthetic Data Generator for TraceNet
Simulates realistic Indian banking transaction flows with ground-truth scenarios,
benign counterexamples, and connected graph structures.
All amounts are generated in Indian Rupee (INR / ₹) with channels (UPI, IMPS, NEFT, RTGS).
"""
import random
from datetime import datetime, timedelta, timezone
import json
import os
import pandas as pd
from sqlalchemy.orm import Session

from src.backend.database import SessionLocal, init_db
from src.backend.models import Transaction, Account, User

RANDOM_SEED = 42

INDIAN_NAMES = [
    ("Aarav Mehta", "SAVINGS"),
    ("Priya Sharma", "SAVINGS"),
    ("Vikram Singhania", "CURRENT"),
    ("Ananya Iyer", "SAVINGS"),
    ("Rohan Deshmukh", "SAVINGS"),
    ("Neha Verma", "SAVINGS"),
    ("Kavita Reddy", "CURRENT"),
    ("Nexus Logistics Pvt Ltd", "CURRENT"),
    ("Bharat Retailers", "MERCHANT"),
    ("Skyline Tech Solutions", "CURRENT"),
    ("Aditya Chawla", "SAVINGS"),
    ("Pooja Nair", "SAVINGS"),
    ("Sanjay Gupta", "CURRENT"),
    ("Deepak Joshi", "SAVINGS"),
    ("Meera Nambiar", "SAVINGS"),
    ("Zenith Trade Corp", "CURRENT"),
    ("Kiran Patil", "SAVINGS"),
    ("Ritu Agarwal", "SAVINGS"),
    ("Manoj Tiwari", "SAVINGS"),
    ("Apex Bullion & Jewellers", "MERCHANT"),
    ("Alpha Mule Transit 01", "CURRENT"),
    ("Alpha Mule Transit 02", "SAVINGS"),
    ("Alpha Mule Transit 03", "SAVINGS"),
    ("Alpha Mule Collector", "CURRENT"),
    ("Sleeper Account 99", "SAVINGS"),
]

CHANNELS = ["UPI", "IMPS", "NEFT", "RTGS"]

def generate_synthetic_data(seed: int = RANDOM_SEED, base_time: datetime | None = None) -> tuple[list[dict], list[dict]]:
    """
    Generate deterministic accounts and transactions with labeled scenarios.
    """
    random.seed(seed)
    if base_time is None:
        base_time = datetime(2026, 10, 10, 9, 0, 0, tzinfo=timezone.utc)
        
    accounts = []
    account_lookup = {}
    
    # 1. Create Accounts
    for idx, (name, acc_type) in enumerate(INDIAN_NAMES, start=1):
        acc_id = f"ACC-IND-{idx:04d}"
        is_mule = "Mule" in name or "Sleeper" in name
        acc = {
            "account_id": acc_id,
            "account_name": name,
            "account_type": acc_type if not is_mule else "MULE_SUSPECT",
            "kyc_status": "FLAGGED" if is_mule else "VERIFIED",
            "risk_score": 75.0 if is_mule else random.uniform(5.0, 25.0),
            "is_flagged": is_mule,
            "created_at": base_time - timedelta(days=random.randint(180, 500))
        }
        accounts.append(acc)
        account_lookup[idx] = acc_id

    transactions = []
    t_id = 1000

    def add_txn(sender_idx, receiver_idx, amount, dt, channel="UPI", tx_type="TRANSFER",
                status="COMPLETED", label="BENIGN", scenario_id="NORMAL_FLOW", desc=None):
        nonlocal t_id
        t_id += 1
        txn_id = f"TX-IND-{t_id:06d}"
        if desc is None:
            desc = f"{channel} transfer of INR {amount:,.2f}"
        txn = {
            "transaction_id": txn_id,
            "sender_account_id": account_lookup[sender_idx],
            "receiver_account_id": account_lookup[receiver_idx],
            "amount": round(float(amount), 2),
            "currency": "INR",
            "timestamp": dt,
            "transaction_type": tx_type,
            "status": status,
            "channel": channel,
            "description": desc,
            "ground_truth_label": label,
            "scenario_id": scenario_id,
            "created_at": dt
        }
        transactions.append(txn)
        return txn

    # --- Scenario 1: Benign Baseline Activity (P2P, Salary, Merchant Shopping) ---
    curr_time = base_time - timedelta(days=15)
    for day in range(15):
        day_time = curr_time + timedelta(days=day)
        # Recurring salary on day 5
        if day == 5:
            add_txn(8, 1, 145000.0, day_time + timedelta(hours=9, minutes=15), "NEFT", "PAYMENT", "COMPLETED", "BENIGN", "SALARY_DISPATCH", "Monthly Salary Credit")
            add_txn(8, 2, 185000.0, day_time + timedelta(hours=9, minutes=20), "NEFT", "PAYMENT", "COMPLETED", "BENIGN", "SALARY_DISPATCH", "Monthly Salary Credit")
            add_txn(10, 4, 120000.0, day_time + timedelta(hours=10, minutes=5), "NEFT", "PAYMENT", "COMPLETED", "BENIGN", "SALARY_DISPATCH", "Monthly Salary Credit")
        
        # P2P Transfers & Merchant buys
        add_txn(1, 9, random.uniform(800.0, 4500.0), day_time + timedelta(hours=12, minutes=30), "UPI", "PAYMENT", "COMPLETED", "BENIGN", "MERCHANT_RETAIL", "Grocery & Supplies")
        add_txn(2, 9, random.uniform(500.0, 3200.0), day_time + timedelta(hours=14, minutes=10), "UPI", "PAYMENT", "COMPLETED", "BENIGN", "MERCHANT_RETAIL", "Cafe & Dining")
        add_txn(3, 8, random.uniform(25000.0, 75000.0), day_time + timedelta(hours=15, minutes=0), "IMPS", "TRANSFER", "COMPLETED", "BENIGN", "B2B_SETTLEMENT", "Vendor Invoice Settlement")
        add_txn(4, 5, random.uniform(1500.0, 10000.0), day_time + timedelta(hours=18, minutes=45), "UPI", "TRANSFER", "COMPLETED", "BENIGN", "P2P_SPLIT", "Dinner bill split")

    # Counterexamples for rules:
    # High-value legitimate corporate transfer (NEFT, large but historical business)
    add_txn(8, 10, 850000.0, base_time - timedelta(days=3), "RTGS", "TRANSFER", "COMPLETED", "BENIGN", "BENIGN_HIGH_VALUE_B2B", "Annual IT Infrastructure Renewal")
    
    # Repeated legitimate transfers to same known friend (does NOT trigger counterparty diversity)
    for i in range(4):
        add_txn(1, 5, 4000.0, base_time - timedelta(days=2, hours=i), "UPI", "TRANSFER", "COMPLETED", "BENIGN", "BENIGN_REPEAT_P2P", "Rent contribution")

    # --- Scenario 2: Suspicious Velocity Burst (R01) ---
    # Account 6 sends 6 high-speed transfers in 12 minutes
    vel_time = base_time - timedelta(hours=5)
    for k in range(6):
        add_txn(
            6, 11 + (k % 4), 95000.0,
            vel_time + timedelta(minutes=k * 2),
            "UPI", "TRANSFER", "COMPLETED",
            "SUSPICIOUS_VELOCITY", "SCENARIO_VELOCITY_SPIKE",
            f"Automated rapid micro-transfer {k+1}/6"
        )

    # --- Scenario 3: Suspicious Baseline Amount Deviation (R02) ---
    # Account 7 (historical mean ~₹15,000) suddenly sends ₹9,20,000
    dev_time = base_time - timedelta(hours=4, minutes=20)
    add_txn(
        7, 20, 920000.0, dev_time, "RTGS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_AMOUNT_DEVIATION", "SCENARIO_SPIKE_DEVIATION",
        "Sudden uncharacteristic RTGS outward transfer"
    )

    # --- Scenario 4: Rapid Onward Pass-Through / Layering (R03) ---
    # Account 21 (Mule Transit 01) receives ₹5,00,000, transfers ₹4,85,000 out 9 minutes later
    pt_time = base_time - timedelta(hours=3, minutes=30)
    add_txn(
        12, 21, 500000.0, pt_time, "IMPS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_PASS_THROUGH", "SCENARIO_RAPID_PASS_THROUGH",
        "Mule initial funding"
    )
    add_txn(
        21, 22, 485000.0, pt_time + timedelta(minutes=9), "IMPS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_PASS_THROUGH", "SCENARIO_RAPID_PASS_THROUGH",
        "Immediate rapid pass-through layering onward"
    )

    # --- Scenario 5: Counterparty Diversity Surge (R04) ---
    # Account 14 suddenly sends to 7 novel accounts within 2 hours
    cps_time = base_time - timedelta(hours=2)
    for c_idx in range(7):
        target = 15 + (c_idx % 8)
        if target == 14:
            target = 13
        add_txn(
            14, target, 38000.0, cps_time + timedelta(minutes=c_idx * 15),
            "UPI", "TRANSFER", "COMPLETED",
            "SUSPICIOUS_COUNTERPARTY_SURGE", "SCENARIO_COUNTERPARTY_BURST",
            f"Burst transfer to distinct counterparty {c_idx+1}"
        )

    # --- Scenario 6: Fan-In Smurfing / Mule Aggregation (R05) ---
    # 5 disparate senders transfer ₹65,000 - ₹90,000 each to Alpha Mule Collector (Acc 24)
    smurf_time = base_time - timedelta(hours=1, minutes=45)
    for s_idx in [16, 17, 18, 19, 23]:
        add_txn(
            s_idx, 24, 75000.0, smurf_time + timedelta(minutes=random.randint(2, 45)),
            "UPI", "TRANSFER", "COMPLETED",
            "SUSPICIOUS_FAN_IN_SMURFING", "SCENARIO_FAN_IN_AGGREGATION",
            "Smurfed inflow into central mule collector"
        )

    # --- Scenario 7: Circular Layering Loop (R06) ---
    # ACC 21 -> ACC 22 -> ACC 23 -> ACC 21 (Cycle of length 3)
    loop_time = base_time - timedelta(minutes=50)
    add_txn(
        21, 22, 280000.0, loop_time, "IMPS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_CIRCULAR_LOOP", "SCENARIO_CIRCULAR_RING",
        "Cycle hop 1: A -> B"
    )
    add_txn(
        22, 23, 275000.0, loop_time + timedelta(minutes=10), "IMPS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_CIRCULAR_LOOP", "SCENARIO_CIRCULAR_RING",
        "Cycle hop 2: B -> C"
    )
    add_txn(
        23, 21, 270000.0, loop_time + timedelta(minutes=20), "IMPS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_CIRCULAR_LOOP", "SCENARIO_CIRCULAR_RING",
        "Cycle hop 3: C -> A (Circle Completed)"
    )

    # --- Scenario 8: Dormant Account Reactivation (R07) ---
    # Account 25 (Sleeper Account) was dormant for 120 days, suddenly sends ₹4,50,000
    dormant_time = base_time - timedelta(minutes=15)
    # Give it an ancient transaction 130 days ago
    add_txn(
        25, 1, 500.0, base_time - timedelta(days=130), "UPI", "TRANSFER", "COMPLETED",
        "BENIGN", "HISTORICAL_ACTIVITY", "Old historical micro payment"
    )
    # The sudden dormant reactivation transfer
    add_txn(
        25, 24, 450000.0, dormant_time, "RTGS", "TRANSFER", "COMPLETED",
        "SUSPICIOUS_DORMANT_REACTIVATION", "SCENARIO_DORMANT_AWAKENING",
        "High-value sudden awakening transfer from dormant account"
    )

    # Sort transactions by timestamp
    transactions.sort(key=lambda x: x["timestamp"])

    return accounts, transactions


def seed_database(db: Session, seed: int = RANDOM_SEED) -> tuple[int, int]:
    """
    Populate database with deterministic synthetic dataset and default users.
    """
    # 1. Seed demo users
    demo_users = [
        User(
            user_id="USR-001",
            username="analyst_priya",
            email="priya.sharma@tracenet.bank",
            full_name="Priya Sharma",
            role="ANALYST_L2",
            password_hash="demo123"
        ),
        User(
            user_id="USR-002",
            username="mlro_supervisor",
            email="vikram.singh@tracenet.bank",
            full_name="Vikram Singh",
            role="MLRO",
            password_hash="supervisor123"
        )
    ]
    for u in demo_users:
        if not db.query(User).filter(User.username == u.username).first():
            db.add(u)
    
    accounts_data, txns_data = generate_synthetic_data(seed)
    
    # Seed Accounts
    acc_count = 0
    for acc in accounts_data:
        existing = db.query(Account).filter(Account.account_id == acc["account_id"]).first()
        if not existing:
            db.add(Account(**acc))
            acc_count += 1
            
    # Seed Transactions
    txn_count = 0
    for txn in txns_data:
        existing = db.query(Transaction).filter(Transaction.transaction_id == txn["transaction_id"]).first()
        if not existing:
            db.add(Transaction(**txn))
            txn_count += 1
            
    db.commit()
    return acc_count, txn_count


def export_synthetic_csv(filepath: str = "data/demo_transactions.csv"):
    """Export the synthetic transactions to CSV for testing CSV import functionality."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    _, txns = generate_synthetic_data()
    df = pd.DataFrame(txns)
    df.to_csv(filepath, index=False)
    print(f"Exported {len(df)} transactions to {filepath}")
    return filepath


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        a_count, t_count = seed_database(db)
        print(f"Successfully seeded database with {a_count} accounts and {t_count} transactions.")
        export_synthetic_csv()
    finally:
        db.close()
