# TraceNet: Context & Development State

---

## 1. Current Implementation State
- **Phase**: Complete P0 Platform Delivered & Verified.
- **Git State**: Master branch initialized. Clean directory structure with all required files in place.
- **Backend**: FastAPI 0.143, SQLAlchemy 2.0, Pydantic v2, NetworkX 3.7, SQLite `tracenet.db`.
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
│   └── CONTEXT.md
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
    └── test_case_and_api.py
```

---

## 3. Verified Commands & Test Outcomes

1. **Deterministic Data Generation & Seeding**:
   - Command: `.\venv\Scripts\python.exe -m src.backend.data_generator`
   - Outcome: Generated 25 Indian accounts and 94 transactions with labeled scenarios. Exported to `data/demo_transactions.csv`. Exited code 0.

2. **Automated Backend Pytest Suite**:
   - Command: `.\venv\Scripts\python.exe -m pytest tests/ -v`
   - Outcome: **11 passed in 2.72s (100% success rate)**.
     - `test_health_check_endpoint` PASSED
     - `test_case_state_transitions` PASSED
     - `test_api_list_transactions_and_overview` PASSED
     - `test_evaluation_run_endpoint` PASSED
     - `test_r01_velocity_spike_triggers` PASSED
     - `test_r01_velocity_normal_cadence_passes` PASSED
     - `test_r02_amount_deviation_triggers` PASSED
     - `test_r03_rapid_pass_through_triggers` PASSED
     - `test_r05_fan_in_smurfing_triggers` PASSED
     - `test_r06_circular_transfer_triggers` PASSED
     - `test_r07_dormant_spike_triggers` PASSED

3. **Frontend Production Build & Strict TypeScript Compilation**:
   - Command: `npm.cmd --prefix src/frontend run build`
   - Outcome: **Exited code 0**. TypeScript validation passed, Vite transformed 1,588 modules, generated optimized production bundle in `dist/`.

4. **Evaluation Benchmark Verification**:
   - Accuracy: 77.7%, Precision: 100.0%, Latency: ~0.55 ms/tx. Naive baseline comparison executed.

---

## 4. Key Decisions & Feature Implemented
- **Mint Green & White Visual Design**: Strict palette implementation using `#10B981` (Mint), `#059669` (Dark Mint), and `#FFFFFF` (Crisp White).
- **Indian Financial Localization**: Currency symbol `₹` (INR), Indian numbering formatting (`Lakhs` & `Crores`), payment rails (`UPI`, `IMPS`, `NEFT`, `RTGS`).
- **Analyst Authentication Page**: Dedicated login form with credentials verification (`analyst_priya` / `demo123`, `mlro_supervisor` / `supervisor123`), clearance levels (`ANALYST_L2`, `MLRO`), and quick 1-click demo auto-fill.
- **Live Graph Intelligence**:
  - Interactive SVG canvas with zoom, pan, reset, and account focus.
  - Cycle detection highlighting laundering rings ($A \to B \to C \to A$) with glowing dashed crimson vectors.
  - Indian ranges filter: `All`, `₹50,000+`, `₹1,00,000+` (1L), `₹2,50,000+` (2.5L), `₹5,00,000+` (5L).
  - Real-time simulation event streamer.
  - Account Dossier slide-in drawer with 1-click case creation.
- **Case Investigation & Audit**: State machine transition enforcement, analyst notes with author tracking, and immutable audit logs.
- **Evaluation Lab**: 2x2 confusion matrix with baseline comparison card.

---

## 5. Next Steps
- Run frontend and backend servers concurrently for live hackathon demonstration.
- Optional P1 additions: Export case investigation dossier as formatted PDF/JSON.
