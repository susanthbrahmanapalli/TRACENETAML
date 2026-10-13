# TraceNet: System Architecture

---

## 1. System Overview & Component Responsibilities

TraceNet is an explainable decision-support platform designed for bank fraud and AML compliance teams. It orchestrates real-time transaction ingestion, rule-based risk scoring, directed network graph intelligence, alert triage, investigative case management, and immutable audit trails.

```mermaid
flowchart TD
    subgraph Frontend["React 19 + TypeScript + Vite (Mint Green & White)"]
        UI_Nav["App Shell & Navigation"]
        UI_Ops["Operations Overview"]
        UI_Txn["Transaction Explorer"]
        UI_Graph["Cytoscape Graph Intelligence"]
        UI_Alerts["Alert Queue & Triage"]
        UI_Cases["Case Management & Audit Timeline"]
        UI_Eval["Evaluation Lab & Confusion Matrix"]
    end

    subgraph Backend["FastAPI Orchestration Layer"]
        API_Router["Versioned REST API (/api/v1)"]
        Ingest_Module["Ingestion & Validator (CSV / Feed)"]
        Risk_Engine["Rule & Risk Scoring Engine"]
        Graph_Engine["NetworkX Graph Intelligence Engine"]
        Case_Manager["Alert & Case State Machine"]
        Audit_Logger["Audit Trail Service"]
        Eval_Service["Evaluation Benchmark Runner"]
        Synthetic_Gen["Deterministic Synthetic Generator"]
    end

    subgraph Storage["Persistence & Memory Layer"]
        DB[(SQLite / PostgreSQL via SQLAlchemy)]
        Graph_Mem[(In-Memory DiGraph Network)]
    end

    UI_Nav --> API_Router
    API_Router --> Ingest_Module
    API_Router --> Risk_Engine
    API_Router --> Graph_Engine
    API_Router --> Case_Manager
    API_Router --> Audit_Logger
    API_Router --> Eval_Service
    API_Router --> Synthetic_Gen

    Ingest_Module --> DB
    Ingest_Module --> Graph_Mem
    Risk_Engine --> DB
    Risk_Engine --> Graph_Mem
    Case_Manager --> DB
    Audit_Logger --> DB
```

---

## 2. Data Flow & Transaction Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Compliance Analyst
    participant API as FastAPI Gateway
    participant Ingest as Ingestion & Validator
    participant Risk as Risk & Rules Engine
    participant Graph as NetworkX Graph Engine
    participant DB as SQLAlchemy Storage
    participant Audit as Audit Trail

    Analyst->>API: POST /api/v1/transactions/import (CSV / JSON)
    API->>Ingest: Validate Schema, Currency (INR ₹), Timestamps
    Ingest->>DB: Check Idempotency & Persist Valid Transactions
    Ingest->>Graph: Upsert Nodes (Accounts) & Edges (Transfers)
    
    loop For each imported / evaluated transaction
        API->>Risk: Evaluate Account Baselines & Rules (R01..R07)
        Risk->>Graph: Query Cycles, Rapid Onward Flows, Fan-In/Out
        Graph-->>Risk: Topological Signals & Path Evidence
        Risk->>DB: Persist Risk Assessment & Score (0-100)
        opt If Score >= Configured Threshold (e.g., 55.0)
            Risk->>DB: Generate Alert (CRITICAL / HIGH / MEDIUM / LOW)
            Risk->>Audit: Log Alert Creation
        end
    end

    Analyst->>API: GET /api/v1/alerts
    API-->>Analyst: List Active Alerts with Trigger Evidence
    Analyst->>API: POST /api/v1/cases (Create Case from Alert)
    API->>DB: Persist Case & Link Alert
    API->>Audit: Record Case Creation Event
    Analyst->>API: PATCH /api/v1/cases/{id} (Add Note & Transition Status)
    API->>DB: Validate State Transition & Save
    API->>Audit: Log Status Change + Before/After State
```

---

## 3. Database Schema & Data Models

### 3.1 Relational Schema (SQLAlchemy ORM)

```mermaid
erDiagram
    TRANSACTIONS ||--o{ RISK_ASSESSMENTS : "evaluated_by"
    TRANSACTIONS }|--|| ACCOUNTS : "sender_account"
    TRANSACTIONS }|--|| ACCOUNTS : "receiver_account"
    RISK_ASSESSMENTS ||--o{ ALERTS : "triggers"
    ALERTS }o--o| CASES : "linked_to"
    CASES ||--o{ CASE_NOTES : "contains"
    CASES ||--o{ AUDIT_LOGS : "audited_by"
    ALERTS ||--o{ AUDIT_LOGS : "audited_by"
    
    TRANSACTIONS {
        string transaction_id PK
        string sender_account_id FK
        string receiver_account_id FK
        float amount
        string currency
        datetime timestamp
        string transaction_type
        string status
        string channel
        string description
        datetime created_at
    }

    ACCOUNTS {
        string account_id PK
        string account_name
        string account_type
        string kyc_status
        float risk_score
        datetime opened_at
    }

    RISK_ASSESSMENTS {
        string assessment_id PK
        string transaction_id FK
        string account_id
        float score
        string risk_priority
        json triggered_rules
        json evidence_data
        string ruleset_version
        datetime evaluated_at
    }

    ALERTS {
        string alert_id PK
        string transaction_id FK
        string assessment_id FK
        string account_id
        string priority
        float risk_score
        string status
        json evidence_summary
        string case_id FK
        string assigned_to
        datetime created_at
        datetime updated_at
    }

    CASES {
        string case_id PK
        string case_reference
        string title
        string status
        string priority
        string assigned_analyst
        string resolution_rationale
        datetime created_at
        datetime updated_at
    }

    CASE_NOTES {
        string note_id PK
        string case_id FK
        string author
        string content
        datetime created_at
    }

    AUDIT_LOGS {
        string audit_id PK
        string entity_type
        string entity_id
        string action
        string actor
        json before_state
        json after_state
        string description
        datetime timestamp
    }
```

---

## 4. Graph Analytics Model

The transaction network is represented as an in-memory directed multigraph `G = (V, E)` using NetworkX:
- **Vertices (V)**: Accounts identified by pseudonymous IDs (e.g., `ACC-IND-7491`). Attributes: total sent, total received, net balance, degree, known risk score.
- **Edges (E)**: Transaction events `(u, v, key)`. Attributes: `transaction_id`, `amount` (INR `₹`), `timestamp`, `channel` (UPI, IMPS, NEFT, RTGS), `status`.
- **Topological Features Computed**:
  - **Ego-Network / k-hop Neighborhood**: Extract induced subgraphs up to depth $k \le 3$ with max $N \le 100$ nodes to avoid memory bloat.
  - **Elementary Cycle Detection**: Directed cycle searches ($3 \le \text{length} \le 5$) executed on time-bounded sliding windows to identify circular layering paths ($A \to B \to C \to A$).
  - **Fan-In / Fan-Out Ratio**:
    $$\text{Fan-In Ratio} = \frac{\text{In-Degree}}{\text{Out-Degree} + 1}$$
    Detecting smurfing / money mule aggregation hubs.
  - **Rapid Onward Flow**: Tracing sequential incoming $\to$ outgoing fund movements within a bounded $\Delta t$ (e.g. within 30 minutes, outgoing amount $\ge 85\%$ of incoming amount).

---

## 5. API Endpoint Contracts

All routes are versioned under `/api/v1`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health status and database connectivity |
| `POST` | `/api/v1/transactions/import` | Batch import transactions via CSV or JSON payload |
| `GET` | `/api/v1/transactions` | Query transactions with search, sorting, channel filters, pagination |
| `GET` | `/api/v1/transactions/{id}` | Retrieve individual transaction details and associated assessment |
| `POST` | `/api/v1/risk/assess` | Trigger risk scoring on a specific transaction or batch |
| `GET` | `/api/v1/alerts` | Query active and historical alerts filtered by priority/status |
| `GET` | `/api/v1/alerts/{id}` | Detailed alert evidence, triggered rules, and linked case |
| `GET` | `/api/v1/graph/network/{account_id}` | Bounded k-hop neighborhood graph with nodes, edges, and cycles |
| `GET` | `/api/v1/graph/cycles` | Top detected circular laundering paths across the network |
| `GET` | `/api/v1/cases` | List compliance investigation cases |
| `POST` | `/api/v1/cases` | Create a new case and optionally attach alerts |
| `GET` | `/api/v1/cases/{id}` | Case detail with linked alerts, transactions, and notes |
| `PATCH` | `/api/v1/cases/{id}` | Update case status, assign analyst, or close with rationale |
| `POST` | `/api/v1/cases/{id}/notes` | Append investigative note to case |
| `GET` | `/api/v1/cases/{id}/audit` | Filtered audit log for specific case lifecycle |
| `GET` | `/api/v1/audit` | System-wide audit log trail |
| `POST` | `/api/v1/demo/generate` | Generate deterministic synthetic Indian banking dataset |
| `GET` | `/api/v1/evaluation/run` | Execute benchmark evaluation against ground-truth labels |
| `GET` | `/api/v1/stats/overview` | Executive KPI dashboard aggregates |

---

## 6. Error-Handling Strategy

1. **Standardized JSON Error Structure**:
   ```json
   {
     "error": {
       "code": "RESOURCE_NOT_FOUND",
       "message": "Transaction 'TX-9999' was not found in the ledger.",
       "details": null,
       "timestamp": "2026-10-13T05:30:00Z"
     }
   }
   ```
2. **HTTP Status Codes**:
   - `400 Bad Request`: Validation failure (malformed CSV, missing required fields).
   - `404 Not Found`: Non-existent entity.
   - `409 Conflict`: Invalid state transition or duplicate idempotency key.
   - `422 Unprocessable Entity`: Schema constraint violation (Pydantic validation).
   - `500 Internal Server Error`: Safe sanitized error messages (stack traces suppressed).

---

## 7. Audit Architecture

Every modifying action executes through the `AuditService`:
- Captures: `actor` (analyst ID or 'SYSTEM'), `action` (`TRANSACTION_IMPORT`, `RULE_EVALUATION`, `ALERT_GENERATED`, `CASE_CREATED`, `CASE_STATUS_CHANGED`, `NOTE_ADDED`), `entity_type`, `entity_id`, `before_state`, `after_state`, and timestamp.
- Prototype uses SQLite table `audit_logs` with indexed timestamps.
- Institutional scaling path: Forward audit events to an immutable WORM (Write Once Read Many) append-only event store (e.g., AWS S3 Object Lock, Kafka with tamper-evident hash chaining).

---

## 8. Scaling Path & Institutional Roadmap

1. **Storage Tier**: SQLite $\to$ PostgreSQL with read replicas; TimeScaleDB or ClickHouse for multi-billion transaction streaming ledgers.
2. **Graph Intelligence Tier**: NetworkX $\to$ Neo4j cluster or AWS Neptune for distributed sub-second multi-hop graph queries.
3. **Stream Ingestion**: FastAPI endpoint $\to$ Apache Kafka / Redpanda pipeline with Apache Flink for real-time sliding-window feature aggregations.
