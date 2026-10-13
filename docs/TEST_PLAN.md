# TraceNet: Comprehensive Quality Assurance & Reliability Test Plan
## Test Strategy & Audit Framework v1.0.0

---

## 1. Scope & Objectives

This test plan defines the verification strategy for **TraceNet**, an explainable, bank-first Anti-Money Laundering (AML) and financial fraud risk orchestration platform.
The objective is to establish what actually works, detect defects across frontend and backend, stress boundary conditions, test edge cases, review application security, and provide reproducible test evidence.

### Out of Scope:
- Live external banking API connectivity (system is designed for decision support using synthetic and research fixtures).
- Automated live SAR/STR filings to regulatory bodies (system explicitly enforces human-in-the-loop review).

---

## 2. Test Strategy & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    End-to-End Workflows                    │
│      Ingestion ➔ Scoring ➔ Graph ➔ Alert ➔ Case ➔ Audit      │
├──────────────────────────────┬──────────────────────────────┤
│     Frontend UI Suite        │    API Contract Integration   │
│  Components, Forms, Canvas   │  HTTP Status, Serialization  │
├──────────────────────────────┴──────────────────────────────┤
│               Core Algorithmic Unit Tests                   │
│   7 Risk Rules, NetworkX Traversal, Confusion Matrix Math   │
├─────────────────────────────────────────────────────────────┤
│         Persistence, Security & Input Sanitization          │
│   SQLAlchemy ORM, Idempotency, File Limits, Auth Bounds     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Test Suites & Categorization

### Suite A: Ingestion & Field Normalization (`tests/test_ingestion_edge_cases.py`)
- **TC-ING-01**: Valid standard Indian banking CSV import.
- **TC-ING-02**: Empty CSV upload handling (zero-byte payload).
- **TC-ING-03**: Malformed/corrupt CSV content (unparseable tokens).
- **TC-ING-04**: Missing required headers (`transaction_id`, `sender_account_id`, `receiver_account_id`).
- **TC-ING-05**: Alternate column alias mapping (`tx_id`, `from_account`, `to_account`, `val`, `date`).
- **TC-ING-06**: Negative and zero amounts rejection.
- **TC-ING-07**: Duplicate `transaction_id` handling (idempotency within same batch and across repeat uploads).
- **TC-ING-08**: Missing and custom currency codes (defaulting to INR, rejection of blank/invalid).
- **TC-ING-09**: Offset-naive vs offset-aware timestamp parsing.
- **TC-ING-10**: Invalid/unsupported transaction statuses.
- **TC-ING-11**: Self-transfers (`sender_account_id == receiver_account_id`).
- **TC-ING-12**: Maximum upload payload size enforcement (anti-DoS guard).

### Suite B: Risk Scoring & Rule Correctness (`tests/test_rules_comprehensive.py`)
- **TC-RSK-01**: `R01_VELOCITY_SPIKE` threshold boundary: 4 transactions (pass) vs 5 transactions (fire).
- **TC-RSK-02**: `R02_AMOUNT_DEVIATION` boundary: exact 3.0σ z-score cutoff and minimum amount guard.
- **TC-RSK-03**: `R03_RAPID_PASS_THROUGH`: 84% pass-through (pass) vs 85% pass-through within 30m (fire).
- **TC-RSK-04**: `R04_COUNTERPARTY_SURGE`: Novel counterparty burst detection vs repeat transfers to existing vendor.
- **TC-RSK-05**: `R05_FAN_IN_SMURFING`: Inbound count $\ge 4$ and amount $\ge ₹3,00,000$ smurfing hub triggers.
- **TC-RSK-06**: `R06_CIRCULAR_TRANSFER`: 3-hop directed cycle detection vs linear transaction chains.
- **TC-RSK-07**: `R07_DORMANT_SPIKE`: 89 days dormancy (pass) vs 91 days dormancy with $\ge ₹2,50,000$ (fire).
- **TC-RSK-08**: Composite score normalization: Ceiling strictly bounded at $100.0$.
- **TC-RSK-09**: Priority mappings: CRITICAL ($\ge 90$), HIGH ($75-89$), MEDIUM ($55-74$), LOW ($< 55$).
- **TC-RSK-10**: Temporal integrity: Features strictly calculated using data prior to transaction timestamp (zero future leakage).

### Suite C: Graph Intelligence & Topological Limits (`tests/test_graph_engine_edge_cases.py`)
- **TC-GRP-01**: Bounded $k$-hop ego extraction (depth 1, 2, 3 respected).
- **TC-GRP-02**: Maximum node limits respected under dense network topology.
- **TC-GRP-03**: Cycle detection bounded traversal (avoids combinatorial explosions).
- **TC-GRP-04**: Cycle transaction resolution accurately matches source edges.
- **TC-GRP-05**: Disconnected subgraphs remain isolated without phantom edges.
- **TC-GRP-06**: Ignored non-completed (failed/reversed) transfers in graph cash flow paths.

### Suite D: Case Management State Machine & Audit (`tests/test_cases_and_audit.py`)
- **TC-CAS-01**: Permitted transitions: `NEW` $\to$ `UNDER_REVIEW` $\to$ `ESCALATED` $\to$ `SAR_RECOMMENDED` $\to$ `CLOSED_RESOLVED`.
- **TC-CAS-02**: Forbidden transition rejection: `NEW` $\to$ `SAR_RECOMMENDED` directly (HTTP 409 Conflict).
- **TC-CAS-03**: Case reopening: `CLOSED_RESOLVED` $\to$ `UNDER_REVIEW`.
- **TC-CAS-04**: Linking and unlinking alerts to an active case.
- **TC-CAS-05**: Resolution rationale validation: closure requires non-empty rationale.
- **TC-CAS-06**: Investigation notes chronological ordering and author preservation.
- **TC-CAS-07**: Audit trail recording before/after state diffs on every case update.

### Suite E: Evaluation Lab Integrity (`tests/test_evaluation_metrics.py`)
- **TC-EVL-01**: Confusion matrix arithmetic: $TP + FP + TN + FN = N$.
- **TC-EVL-02**: Precision, Recall, F1-Score zero-division handling on edge datasets.
- **TC-EVL-03**: Verification that `ground_truth_label` is NEVER used by the detector engine (leakage audit).
- **TC-EVL-04**: Baseline comparison computation accuracy.

### Suite F: API Contracts & Security Review (`tests/test_api_contracts_and_security.py`)
- **TC-SEC-01**: Path traversal / SQL injection prevention via ORM parameterization.
- **TC-SEC-02**: Standardized JSON error response schema (no stack trace leakage).
- **TC-SEC-03**: Input payload validation on all `POST`/`PATCH` routes.
- **TC-SEC-04**: Authentication session & credential validation.

---

## 4. Test Environment & Toolchain

- **Runtime**: Python 3.14.5 (win32), Node.js v24.19.0, npm 11.17.0.
- **Backend Test Runner**: Pytest 9.1.1 with `anyio`, `httpx`, and SQLAlchemy `StaticPool`.
- **Database**: SQLite in WAL mode & in-memory testing fixtures.
- **Frontend Verification**: TypeScript 5.6 strict type checking, Vite 5.4 production bundling.
