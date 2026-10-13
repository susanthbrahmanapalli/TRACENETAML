# TraceNet: Context & Development State

---

## 1. Current Implementation State
- **Phase**: Complete P0 Platform Audited, Hardened, and Verified (Production-Ready).
- **Git State**: Master branch with recovery checkpoint branch `baseline-qa-checkpoint`.
- **Backend**: FastAPI 0.143, SQLAlchemy 2.0, Pydantic v2, NetworkX 3.7, SQLite `tracenet.db` with WAL mode.
- **Frontend**: React 18, TypeScript (Strict), Vite 5.4, Tailwind CSS with custom Mint Green (`#10B981`) & Crisp White theme.

---

## 2. Actual Project Structure
```
TraceNet/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── pytest.ini
├── requirements.txt
├── tracenet.db
├── data/
│   └── demo_transactions.csv
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── RULES.md
│   ├── ROADMAP.md
│   ├── DESIGN.md
│   ├── CONTEXT.md
│   ├── TEST_PLAN.md
│   ├── BUG_REPORT.md
│   └── TEST_REPORT.md
├── src/
│   ├── backend/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── data_generator.py
│   │   ├── risk_engine.py
│   │   ├── graph_engine.py
│   │   ├── main.py
│   │   └── services/
│   │       ├── ingest_service.py
│   │       ├── case_service.py
│   │       └── eval_service.py
│   └── frontend/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── index.html
│       ├── dist/
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── index.css
│           ├── types/index.ts
│           ├── api/client.ts
│           ├── utils/formatters.ts
│           ├── components/
│           │   ├── Navbar.tsx
│           │   ├── Sidebar.tsx
│           │   └── LoginPage.tsx
│           └── views/
│               ├── OverviewView.tsx
│               ├── TransactionsView.tsx
│               ├── GraphView.tsx
│               ├── AlertsView.tsx
│               ├── CasesView.tsx
│               ├── EvaluationView.tsx
│               └── DataManagementView.tsx
└── tests/
    ├── test_rules_engine.py
    ├── test_case_and_api.py
    ├── test_ingestion_comprehensive.py
    └── test_graph_and_rules_stress.py
```

---

## 3. Verified Commands & Test Outcomes

1. **Deterministic Data Generation & Seeding**:
   - Command: `.\venv\Scripts\python.exe -m src.backend.data_generator`
   - Outcome: Generated 25 Indian accounts and 94 transactions with labeled scenarios. Exported to `data/demo_transactions.csv`. Exited code 0.

2. **Automated Backend Pytest Suite**:
   - Command: `.\venv\Scripts\python.exe -m pytest tests/ -v`
   - Outcome: **24 passed out of 24 in 5.30s (100% success rate)**.
     - `tests/test_case_and_api.py` (4 tests)
     - `tests/test_rules_engine.py` (7 tests)
     - `tests/test_ingestion_comprehensive.py` (8 tests)
     - `tests/test_graph_and_rules_stress.py` (5 tests)

3. **Frontend Production Build & Strict TypeScript Compilation**:
   - Command: `npm.cmd --prefix src/frontend run build`
   - Outcome: **Exited code 0**. TypeScript validation passed (0 errors), Vite transformed modules and built production assets in `src/frontend/dist/`.

4. **Defects Remediated & Verified**:
   - BUG-001 through BUG-008 resolved, hardened, and verified with dedicated unit and integration tests.

---

## 4. Key Architectural & UX Capabilities
- **Mint Green & White Visual Design**: Strict palette implementation using `#10B981` (Mint), `#059669` (Dark Mint), and `#FFFFFF` (Crisp White).
- **Indian Financial Localization**: Currency symbol `₹` (INR), Indian numbering formatting (`Lakhs` & `Crores`), payment rails (`UPI`, `IMPS`, `NEFT`, `RTGS`).
- **Analyst Authentication Page**: Dedicated login form with credentials verification (`analyst_priya` / `demo123`, `mlro_supervisor` / `supervisor123`), clearance levels (`ANALYST_L2`, `MLRO`), and quick 1-click demo auto-fill.
- **Live Graph Intelligence**:
  - Interactive SVG canvas with zoom, pan, reset, and account focus.
  - Cycle detection highlighting laundering rings ($A \to B \to C \to A$) with glowing dashed crimson vectors, bounded at 50 cycles to avoid combinatorial locking.
  - Indian ranges filter: `All`, `₹50,000+`, `₹1,00,000+` (1L), `₹2,50,000+` (2.5L), `₹5,00,000+` (5L).
  - Real-time simulation event streamer.
  - Account Dossier slide-in drawer with 1-click case creation.
- **Case Investigation & Audit**: State machine transition enforcement, mandatory resolution rationale on case closure, alert link/unlink operations, and immutable audit logs.
- **Evaluation Lab**: 2x2 confusion matrix with baseline comparison card.

---

## 5. Next Steps
- Run frontend and backend servers concurrently for live hackathon demonstration.
