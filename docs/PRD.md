# TraceNet: Product Requirements Document (PRD)
## Real-Time Fraud & AML Risk Orchestration Platform

---

## 1. Problem Statement & Target Users

### 1.1 Problem Statement
Financial institutions face surging volumes of transactional data across digital channels (e.g., UPI, IMPS, NEFT, RTGS in the Indian banking landscape). Traditional rule-based AML systems are siloed, generating overwhelming numbers of false positives, lacking graph intelligence to detect multi-hop smurfing or cyclical layering schemes, and presenting opaque risk scores without auditable reasoning.

### 1.2 Target Users
1. **AML / Fraud Compliance Analysts (L1/L2)**: Review incoming flagged alerts, evaluate contextual evidence, inspect graph networks, add investigative notes, and recommend escalation or closure.
2. **Compliance Officers / MLROs (Money Laundering Reporting Officers)**: Supervise case resolution, audit compliance actions, review evaluation benchmarks, and verify regulatory defensibility.
3. **Risk Strategy & Rule Engineers**: Monitor rule trigger distributions, test detection scenarios, and benchmark detection performance against labelled test fixtures.

---

## 2. Product Objectives & Explicit Non-Goals

### 2.1 Product Objectives
- Provide a unified **decision-support platform** delivering transparent, explainable risk assessment for transaction flows.
- Combine transaction-level checks, account historical baselines, and network graph analytics (cycles, rapid onward pass-through, fan-in/fan-out mule patterns).
- Enable seamless analyst workflows: triage alerts, inspect interactive graph sub-networks, assign cases, capture structured investigative rationales, and maintain an immutable audit trail.
- Tailor the experience for Indian financial ranges and norms (amounts in Indian Rupee `₹`, Lakhs/Crores formatting, channels like UPI, IMPS, NEFT, RTGS).
- Provide a clean, modern **Mint Green & White** aesthetic emphasizing clarity, trust, and high legibility.
- Provide a quantitative **Evaluation Lab** measuring precision, recall, F1-score, and false-positive rates on reproducible synthetic benchmark datasets.

### 2.2 Explicit Non-Goals
- **Not an Autonomous Enforcement System**: TraceNet does not automatically freeze customer bank accounts, block funds, or automatically file Suspicious Activity Reports (SARs/STRs) with FIU-IND or regulatory authorities. All decisions require human-in-the-loop analyst adjudication.
- **Not a Black-Box Classifier**: Prototype risk scores are explainable composites of deterministic rules and graph signals—never unexplainable neural probabilities or fabricated certainty of crime.
- **No Real Customer Data**: Prototype uses purely synthetic, pseudonymous datasets adhering to privacy best practices.

---

## 3. User Stories & End-to-End Workflow

### 3.1 Primary Workflow
```
Transaction Ingestion (CSV / API / Simulator Feed)
  │
  ▼
Validation & Normalization (Schema, timestamps, INR currency, idempotency)
  │
  ▼
Feature Engineering (Account rolling stats, velocity, counterparty diversity)
  │
  ▼
Risk & Graph Engine (Rule evaluation, network topology, cycle/pass-through detection)
  │
  ▼
Alert Generation (Thresholding, priority assignment, evidence packaging)
  │
  ▼
Case Management (Triage, graph visual inspection, notes, status transitions)
  │
  ▼
Audit Trail (Immutable logging of all analyst actions & state transitions)
```

### 3.2 User Stories
- **US-1 (Ingestion)**: As a compliance engineer, I want to import transaction CSV files or stream synthetic transactions so that the system immediately validates schemas, deduplicates entries, and provides an import summary.
- **US-2 (Explainable Risk)**: As an analyst, I want to see which specific rules fired on an alert, including the exact threshold and evidence values (e.g. "Velocity: 6 transfers in 10 mins; amount ₹4,50,000 exceeded 3x 30-day baseline").
- **US-3 (Graph Intelligence)**: As an investigator, I want to interactively explore an account's transaction network, highlight cyclical laundering routes (A → B → C → A), and observe fan-in smurfing patterns.
- **US-4 (Case Management)**: As an investigator, I want to link alerts to an investigation case, update case status (New → Under Review → Escalated / Closed), assign investigators, and add rationale notes.
- **US-5 (Audit Trail)**: As an auditor / MLRO, I want to inspect a chronological audit log tracking every import, rule evaluation, note addition, and case transition.
- **US-6 (Evaluation Lab)**: As a risk engineer, I want to run detection evaluation against labelled synthetic benchmarks and see precision, recall, F1, and latency.

---

## 4. Functional & Non-Functional Requirements

### 4.1 Functional Requirements
- **FR-1 Ingestion**: Validated REST API (`/api/v1/transactions/import`, `/api/v1/transactions`), CSV batch parsing, streaming demonstration simulator.
- **FR-2 Rule Engine**: 7 distinct modular rules (Velocity, Amount Deviation, Rapid Onward Pass-Through, Counterparty Diversity, Fan-In Smurfing, Circular Transfer Routing, Account Behavioural Deviation).
- **FR-3 Graph Intelligence**: NetworkX-powered directed transaction graph, bounded ego-networks (k-hops), cycle detection (length 3-5), path tracing, node degree analysis.
- **FR-4 Alert Management**: Categorized by priority (CRITICAL, HIGH, MEDIUM, LOW), status (OPEN, INVESTIGATING, RESOLVED, DISMISSED), linked account/transaction metadata.
- **FR-5 Case Management**: Full case lifecycle with validated state transitions, notes, assigned analysts, linked alerts.
- **FR-6 Audit Trail**: Structured event logging capturing actor, timestamp, action, entity, and diffs.
- **FR-7 Evaluation**: Confusion matrix, precision, recall, F1-score, FPR against synthetic ground truth.

### 4.2 Non-Functional Requirements
- **Performance**: Transaction validation and risk scoring under 50ms per transaction; graph queries bounded to < 500ms.
- **Design & UI**: High-contrast, institutional Mint Green (`#10B981` / `#059669` / `#E6F7F2`) and crisp White (`#FFFFFF`) palette, Indian currency formatting (`₹`).
- **Reliability & Idempotency**: Repeated submission of identical `transaction_id` returns cached or idempotent acknowledgment without duplicate scoring.
- **Security**: Strict input validation with Pydantic v2, no SQL injection (SQLAlchemy ORM), CORS protection, zero secrets in source code.

---

## 5. Feature Priorities (P0, P1, P2)

| Feature ID | Feature Name | Priority | Description |
|---|---|---|---|
| **F-01** | Canonical Ingestion & Validation API | **P0** | Ingestion of CSV and JSON transactions with Indian banking fields. |
| **F-02** | 7-Rule Explainable Risk Engine | **P0** | Deterministic rule execution, score normalization (0–100), and evidence generation. |
| **F-03** | Bounded Graph Intelligence API | **P0** | Directed transaction graph, cycle detection, ego-network neighborhood. |
| **F-04** | Alert Queue & Case Lifecycle | **P0** | Persistent alerts, cases, allowed state transitions, analyst notes. |
| **F-05** | Immutable Audit Trail | **P0** | Structured logging of imports, alerts, case updates, and notes. |
| **F-06** | Interactive Mint-Green Dashboard | **P0** | 6 operational screens: Overview, Transactions, Graph, Alerts, Cases, Evaluation. |
| **F-07** | Deterministic Synthetic Data Generator | **P0** | Seeded generator with ground-truth labels and benign counterexamples. |
| **F-08** | Quantitative Evaluation Lab | **P0** | Precision, recall, F1, confusion matrix, baseline comparison. |
| **F-09** | Live Event Feed Simulator | **P1** | Interactive demonstration feed pushing synthetic transactions. |
| **F-10** | Custom Rule Configuration Editor | **P1** | Dynamically adjust rule weights and threshold parameters. |
| **F-11** | Exportable Case Investigation Dossier (PDF/JSON) | **P2** | Export regulatory-ready investigative summary. |

---

## 6. Acceptance Criteria for P0 Features

1. **Ingestion**: Accepts valid CSV/JSON, rejects malformed rows with itemized error reports, handles duplicates idempotently.
2. **Risk Engine**: Produces a normalized score (0–100), priority, and human-readable evidence for all 7 rules. Passes deterministic unit tests.
3. **Graph Intelligence**: Returns nodes, edges, detected cycles, and fan-in/fan-out metrics within defined hops and max nodes.
4. **Alerts & Cases**: Creating a case from an alert links the alert; status transitions strictly adhere to state machine; analyst notes persist.
5. **Audit Trail**: Every case status update and analyst note generates a verifiable audit record.
6. **Frontend**: Rendered in Mint Green and White; currency formatted as `₹` (INR); interactive graph allows zoom, pan, node selection, and neighborhood expansion.
7. **Evaluation**: Computes accuracy metrics against synthetic ground truth, comparing against a naive baseline.

---

## 7. Hackathon Success Criteria & Limitations

- **Success Criteria**: A complete end-to-end demo where an evaluator imports a synthetic Indian banking transaction batch, observes suspicious alerts triggered by cyclical layering or UPI smurfing, explores the interactive graph network in Mint Green UI, opens an investigation case, attaches notes, transitions status, reviews the audit log, and examines the Evaluation Lab benchmark results.
- **Known Limitations**: SQLite database used for prototype single-node deployment; graph processing runs on in-memory NetworkX (future institutional migration path to Neo4j / Amazon Neptune); prototype thresholds are illustrative and configurable.
