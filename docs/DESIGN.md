# TraceNet: Design System & UI Specification

---

## 1. Visual Design System: Mint Green & Crisp White

TraceNet employs a high-trust, institutional fintech design aesthetic built upon a clean **Mint Green** accent and **Crisp White** surface theme. It provides optimal contrast, high data density, and clear risk visualization without visual fatigue.

### 1.1 Color Palette

| Token | Hex Value | Semantic Usage |
|---|---|---|
| `bg-primary` | `#F8FAFC` | Main application background (soft subtle off-white) |
| `surface-white` | `#FFFFFF` | Cards, modals, drawers, tables, graph canvas background |
| `mint-50` | `#ECFDF5` | Subtle mint background tint for highlighted rows, badges, pill tabs |
| `mint-100` | `#D1FAE5` | Soft mint border, secondary chip backgrounds |
| `mint-500` | `#10B981` | Brand primary mint green, primary action buttons, active indicator |
| `mint-600` | `#059669` | Interactive hover state, strong mint accents |
| `mint-700` | `#047857` | Deep mint for accessible text against white surfaces |
| `slate-900` | `#0F172A` | Primary typography, headers, metric values |
| `slate-600` | `#475569` | Secondary labels, descriptions, metadata |
| `slate-200` | `#E2E8F0` | Dividers, card borders, table line separators |
| `risk-critical` | `#DC2626` | Critical priority badges, severe alert indicators, high-risk nodes |
| `risk-high` | `#EA580C` | High priority badges, elevated risk indicators |
| `risk-medium` | `#D97706` | Medium priority alerts, warning states |
| `risk-low` | `#10B981` | Low risk / benign indicators (uses primary mint) |

### 1.2 Currency & Indian Numeric Formatting
- All values are formatted in **Indian Rupee (`₹`)** with standard Indian grouping (thousands, lakhs, crores):
  - Example: `₹12,50,000` (12.5 Lakhs) or `₹1,05,00,000` (1.05 Crores).
- Payment channels explicitly reflect the Indian banking ecosystem: `UPI`, `IMPS`, `NEFT`, `RTGS`, `CARD`, `ATM`.

---

## 2. Information Architecture & Navigation

The layout follows a two-tier shell:
1. **Top Bar**:
   - TraceNet Brand Logo with animated Mint Green beacon.
   - Global Search (search accounts, transaction IDs, case references).
   - System Status & Live Stream toggle ("Live Ingestion Simulator: ACTIVE").
   - Analyst Profile Badge (`Analyst Priya Sharma - Compliance L2`) with Logout button.
2. **Left Sidebar / Main Navigation**:
   - **Operations Overview** (`/overview`): Executive metrics, volume trends, priority breakdown.
   - **Transaction Explorer** (`/transactions`): Filterable tabular ledger with drawer inspection.
   - **Graph Intelligence** (`/graph`): Full-screen interactive transaction network, cycle detector, k-hop slider.
   - **Alert Queue** (`/alerts`): Triage view of rule-triggered alerts, quick case creation.
   - **Case Investigation** (`/cases`): Full case dossier, state machine controls, notes, audit timeline.
   - **Evaluation Lab** (`/evaluation`): Confusion matrix, precision-recall metrics, benchmark runner.
   - **Data Management** (`/import`): Synthetic generator generator & CSV file uploader.

---

## 3. Dedicated Analyst Login View

- **Route**: `/login`
- **Design**: Clean centered card on subtle mint gradient backdrop (`#ECFDF5` to `#FFFFFF`).
- **Fields**:
  - Compliance ID / Username (e.g. `analyst@tracenet.bank` or `compliance_l2`).
  - Secret Passphrase.
  - Role Selector (Compliance Analyst L1/L2, MLRO / Senior Officer, Risk Engineer).
- **Features**: One-click quick login buttons for instant demo review ("Demo Analyst L2", "Demo MLRO Supervisor").

---

## 4. Live Graph Intelligence Interaction Patterns

The Graph Intelligence canvas is a premier analyst workstation component:
- **Canvas Styling**: Clean white background (`#FFFFFF`) with subtle grid dot pattern (`#E2E8F0`).
- **Nodes (Accounts)**:
  - Rounded badges with account initials and ID (`ACC-IND-xxxx`).
  - Colored border according to risk score: Mint green for low risk, orange for medium, bright red for critical.
  - Size proportional to total transfer volume (scaled in Lakhs `₹`).
- **Edges (Transfers)**:
  - Directed arrows showing fund flow direction.
  - Hover tooltip displays: `Txn ID`, `Amount: ₹X,XX,XXX`, `Channel: UPI/IMPS`, `Timestamp`.
  - Edge thickness represents transfer magnitude.
- **Cycle & Path Highlighting**:
  - Laundering loops ($A \to B \to C \to A$) glow in vibrant red/crimson with animated dashed stroke.
  - Button: "Highlight Detected Cycles (3 found)".
- **Control Bar**:
  - Account search input.
  - Hop depth selector: `1-Hop`, `2-Hop`, `3-Hop`.
  - Max Nodes slider: `20` to `100`.
  - Filter by minimum transfer amount in `₹` (e.g. `₹50,000+`).
  - Reset View & Fit to Screen controls.
- **Detail Slide-Over Drawer**:
  - Clicking any node opens an Account Dossier with inbound/outbound volume, total counterparty count, linked alerts, and 1-click "Open Investigation Case".

---

## 5. UI States: Loading, Empty, Error, Success

1. **Loading State**: Subtle pulsing skeleton screens with mint shimmer accents; no jarring spinners.
2. **Empty State**: Institutional friendly illustrations, clear description, and primary mint CTA (e.g., "No active alerts in queue. Generate synthetic demo batch to simulate transaction traffic.").
3. **Error State**: Non-blocking toast notifications and contextual inline alert boxes with actionable retry buttons.
4. **Success State**: Crisp mint green confirmation checkmarks (e.g., "Case TRACE-2026-081 created successfully.").
