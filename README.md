# TraceNet
## Real-Time Fraud & AML Risk Orchestration Platform

TraceNet is an explainable, bank-first Anti-Money Laundering (AML) and financial fraud risk orchestration decision-support platform. Engineered with a specialized focus on digital payment rails (UPI, IMPS, NEFT, RTGS) in the Indian banking landscape, TraceNet combines multi-signal rule scoring, in-memory directed graph intelligence, persistent case management, and quantitative evaluation.

The system features an institutional **Mint Green & Crisp White** visual interface, native **Indian Rupee (`₹`)** financial analytics, an interactive **Live Graph Intelligence** workstation, and dedicated compliance analyst authentication.

---

## 1. Product Architecture & Central Workflow

TraceNet coordinates transactions through an end-to-end audit-driven lifecycle:

```
Transaction Ingestion (CSV / API / Stream Feed)
       │
       ▼
Validation & Normalization (Schema, timestamps, INR currency, idempotency)
       │
       ▼
Feature Engineering (Rolling 15m/2h/24h/30d windows, baseline deviation)
       │
       ▼
Risk Engine (7 Explainable Rules) ─── Graph Intelligence (NetworkX MultiDiGraph)
       │                                     │
       ▼                                     ▼
Alert Generation (Threshold >= 55.0, CRITICAL / HIGH / MEDIUM / LOW)
       │
       ▼
Case Investigation (State Machine: NEW ➔ UNDER_REVIEW ➔ ESCALATED ➔ SAR_RECOMMENDED ➔ CLOSED)
       │
       ▼
Analyst Action & Adjudication Rationale
       │
       ▼
Immutable Structured Audit Trail
```

---

## 2. Key Modules & Capabilities

### 2.1 7 Explainable Risk Rules
1. **`R01_VELOCITY_SPIKE`**: Detects rapid bursts of outgoing transactions (≥5 transfers or ≥₹5,00,000 in 15 mins).
2. **`R02_AMOUNT_DEVIATION`**: Identifies uncharacteristic transfers exceeding 3.0σ above an account's 30-day baseline (≥₹2,00,000).
3. **`R03_RAPID_PASS_THROUGH`**: Flags immediate onward layering of funds (>85% moved onward within ≤30 minutes of receipt).
4. **`R04_COUNTERPARTY_SURGE`**: Catches sudden dispersion across ≥6 novel counterparties in 24 hours.
5. **`R05_FAN_IN_SMURFING`**: Detects structuring/smurfing where multiple senders channel funds into a single collector account within 2 hours.
6. **`R06_CIRCULAR_TRANSFER`**: Finds elementary directed cycles ($A \to B \to C \to A$) through multi-hop graph traversal.
7. **`R07_DORMANT_SPIKE`**: Flags sleeper accounts dormant for >90 days suddenly executing high-value transfers (≥₹2,50,000).

### 2.2 Live Graph Intelligence Workstation
- Interactive canvas with pan, zoom, reset view, and account focus.
- Visualizes directed cash flows with transfer amounts in Indian Rupee (`₹`).
- **Highlight Active Cycles**: Illuminates laundering loops ($A \to B \to C \to A$) with glowing dashed crimson vectors.
- **Indian Range Filtering**: Instant filtering by `₹50,000+`, `₹1,00,000+` (1 Lakh), `₹2,50,000+` (2.5 Lakhs), and `₹5,00,000+` (5 Lakhs).
- **Live Stream Injection**: Injects live synthetic transfers directly into the canvas with instant topological radar animation.
- **Account Dossier Drawer**: Displays account balance aggregates, counterparty degrees, and provides 1-click case creation.

### 2.3 Evaluation Lab
- Deterministic synthetic Indian banking benchmark fixture (Seed: 42).
- Calculates Precision, Recall, F1-Score, False Positive Rate, and Processing Latency.
- 2x2 visual Confusion Matrix (True Positives, False Positives, False Negatives, True Negatives).
- Compares TraceNet against a Naive Static Threshold baseline (>₹3,00,000), proving why multi-signal topological graph detection dramatically outperforms static thresholding.

### 2.4 Case Management & Audit Trail
- Validated state transitions:
  - `NEW` $\to$ `UNDER_REVIEW`
  - `UNDER_REVIEW` $\to$ `ESCALATED` / `SAR_RECOMMENDED` / `CLOSED_RESOLVED` / `CLOSED_FALSE_POSITIVE`
  - `CLOSED_*` $\to$ `UNDER_REVIEW` (Reopening with rationale)
- Immutable audit log capturing actor, before/after state diffs, timestamps, and notes.

---

## 3. Technology Stack

- **Backend**: Python 3.14 / 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, NetworkX, NumPy, Pandas, Pytest.
- **Frontend**: React 18, TypeScript (Strict Mode), Vite, Tailwind CSS (Mint Green & Crisp White Theme), Lucide Icons.
- **Database**: SQLite (default local zero-config database `tracenet.db` with WAL mode) with seamless PostgreSQL compatibility.

---

## 4. Setup & Execution Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 4.1 Backend Setup
```bash
# 1. Activate Python virtual environment
.\venv\Scripts\activate   # Windows
# or source venv/bin/activate on Linux/Mac

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Seed demo dataset (Indian banking scenario)
python -m src.backend.data_generator

# 4. Start backend API server (runs at http://localhost:8000)
uvicorn src.backend.main:app --reload --port 8000
```
Interactive API documentation is accessible at: [http://localhost:8000/docs](http://localhost:8000/docs).

### 4.2 Frontend Setup
```bash
# 1. Navigate to frontend directory
cd src/frontend

# 2. Install npm dependencies
npm install

# 3. Start Vite dev server (runs at http://localhost:5173)
npm run dev
```

---

## 5. Demo Credentials & Walkthrough

### 5.1 Analyst Login
Open [http://localhost:5173](http://localhost:5173). The login screen accepts:
- **Analyst L2**:
  - Username: `analyst_priya`
  - Password: `demo123`
  - Role: `ANALYST_L2` (Compliance Analyst Level 2)
- **MLRO Lead**:
  - Username: `mlro_supervisor`
  - Password: `supervisor123`
  - Role: `MLRO`
- *Or click either of the 1-click Quick Demo Auto-Fill buttons on the login card.*

### 5.2 Recommended Demo Flow
1. **Operations Overview**: Inspect executive telemetry, monitored volume in `₹`, and live stream counters.
2. **Transaction Explorer**: Search for `ACC-IND-0021` or filter by `RTGS` and amount `₹2,50,000+`. Click any transaction to review its 7-rule explainable risk breakdown.
3. **Live Graph Intel**:
   - Click "Highlight Cycles" to instantly illuminate the circular laundering loop `ACC-IND-0021` $\to$ `ACC-IND-0022` $\to$ `ACC-IND-0023` $\to$ `ACC-IND-0021`.
   - Click "Simulate Real-Time Transfer" to inject a live transaction event into the graph.
   - Click any account node to inspect the Account Dossier.
4. **Alert Queue**: Triage critical smurfing alerts and click "Escalate to Case".
5. **Case Investigation**: Append an investigative note, transition status from `NEW` $\to$ `UNDER_REVIEW` $\to$ `ESCALATED`, and verify the real-time audit log timeline.
6. **Evaluation Lab**: Click "Run Quantitative Benchmark" to evaluate precision, recall, confusion matrix, and the baseline comparison card.

---

## 6. Automated Testing

Run the full pytest suite covering validation, all 7 risk engine rules, graph cycle detection, and case state machines:
```bash
python -m pytest tests/ -v
```
To verify the production frontend build:
```bash
cd src/frontend
npm run build
```

---

## 7. Data Privacy & Ethical Compliance

TraceNet is designed strictly as a **decision-support platform**:
- It **does not** automatically freeze accounts, block transactions, or file regulatory SARs without human compliance adjudication.
- All demo data is strictly pseudonymous and deterministically generated. No confidential banking information is used.
- Prototype scoring thresholds are illustrative and customizable.
