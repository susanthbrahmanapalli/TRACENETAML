# TraceNet: Risk Detection Rules Specification
## Explainable Rule Engine v1.0.0

> [!NOTE]
> All numerical thresholds, weights, and scoring ceilings in this document are **illustrative prototype values**. They are designed for transparent demonstration and evaluation and are not calibrated regulatory thresholds. In institutional deployment, thresholds must undergo quantitative validation against empirical ground-truth and risk appetite models.

---

## Overview & Scoring Methodology

The TraceNet Risk Engine computes an explainable risk score $S \in [0, 100]$ for each transaction and associated account context.
The final transaction risk score is calculated via:

$$S = \min\left(100, \sum_{i=1}^{n} w_i \cdot \mathbb{I}(R_i \text{ is triggered}) \times c_i\right)$$

where:
- $w_i$: Illustrative rule base weight.
- $\mathbb{I}(R_i)$: Indicator function whether rule $R_i$ fired.
- $c_i \in [1.0, 1.5]$: Dynamic severity multiplier based on deviation magnitude.
- Alerts are generated whenever $S \ge S_{\text{threshold}}$ (default: $55.0$).

### Priority Classifications:
- **CRITICAL**: $S \ge 90.0$
- **HIGH**: $75.0 \le S < 90.0$
- **MEDIUM**: $55.0 \le S < 75.0$
- **LOW**: $S < 55.0$ (informational, logged but no immediate high-priority alert)

---

## Rule Definitions

### 1. `RULE_VELOCITY_SPIKE` (R01: Transaction Velocity Surge)
- **Rule ID**: `R01_VELOCITY_SPIKE`
- **Purpose & Risk Hypothesis**: A burst of outgoing transfers in a very short duration suggests automated fund draining, compromised credentials, or rapid dispersal before detection.
- **Required Inputs**: `sender_account_id`, `timestamp`, historical sender transfers.
- **Calculation Window**: 15 minutes rolling window.
- **Logic & Configurable Thresholds**:
  - Threshold: Outgoing count $\ge 5$ within 15 minutes.
  - Or total velocity volume $\ge ₹5,00,000$ within 15 minutes.
- **Weight**: 25 points.
- **Evidence Returned**:
  ```json
  {
    "window_minutes": 15,
    "transaction_count": 6,
    "threshold_count": 5,
    "window_amount_inr": 620000.0
  }
  ```
- **Expected False Positives**: Legitimate festival flash shopping, salary batch dispatches, or business supplier payments.
- **Test Cases**: `test_rule_r01_fires_above_5_txns`, `test_rule_r01_passes_normal_cadence`.

---

### 2. `RULE_AMOUNT_DEVIATION` (R02: Baseline Amount Deviation)
- **Rule ID**: `R02_AMOUNT_DEVIATION`
- **Purpose & Risk Hypothesis**: A single transfer value drastically higher than the sender's established 30-day baseline may indicate unauthorized account takeover or mule account monetization.
- **Required Inputs**: `sender_account_id`, `amount`, sender 30-day historical amounts.
- **Calculation Window**: Prior 30 days.
- **Logic & Configurable Thresholds**:
  - Baseline: $\mu_{\text{amt}}$ and $\sigma_{\text{amt}}$. Minimum baseline count $\ge 3$.
  - Triggered if: $\text{amount} > \mu_{\text{amt}} + 3.0 \times \sigma_{\text{amt}}$ AND $\text{amount} \ge ₹2,00,000$.
- **Weight**: 20 points.
- **Evidence Returned**:
  ```json
  {
    "transaction_amount_inr": 850000.0,
    "historical_mean_inr": 25000.0,
    "historical_std_inr": 12000.0,
    "z_score": 68.75
  }
  ```
- **Expected False Positives**: Down-payment on real estate, medical emergencies, annual tax payments.
- **Test Cases**: `test_r02_triggers_on_large_spike`, `test_r02_handles_insufficient_history_gracefully`.

---

### 3. `RULE_RAPID_PASS_THROUGH` (R03: Rapid Onward Layering)
- **Rule ID**: `R03_RAPID_PASS_THROUGH`
- **Purpose & Risk Hypothesis**: Immediate re-transfer of newly credited funds is the signature of money mule transit accounts, preventing funds from resting where they could be frozen.
- **Required Inputs**: `account_id`, incoming transfers, outgoing transfers, timestamps.
- **Calculation Window**: 30 minutes following receipt of funds $\ge ₹1,00,000$.
- **Logic & Configurable Thresholds**:
  - Received amount $A_{\text{in}} \ge ₹1,00,000$.
  - Subsequent outgoing amount $A_{\text{out}} \ge 0.85 \times A_{\text{in}}$ within $\le 30$ minutes.
- **Weight**: 30 points.
- **Evidence Returned**:
  ```json
  {
    "incoming_amount_inr": 500000.0,
    "outgoing_amount_inr": 480000.0,
    "pass_through_ratio": 0.96,
    "delta_minutes": 8.5
  }
  ```
- **Expected False Positives**: Escrow agents, broker margin settlements, personal liquidity balancing across own bank accounts.
- **Test Cases**: `test_r03_rapid_transit_triggers`, `test_r03_delayed_transfer_does_not_trigger`.

---

### 4. `RULE_UNUSUAL_COUNTERPARTY_SURGE` (R04: Counterparty Diversity Surge)
- **Rule ID**: `R04_COUNTERPARTY_SURGE`
- **Purpose & Risk Hypothesis**: An account suddenly sending funds to multiple novel counterparties never encountered in historical activity indicates mule recruitment or account compromise.
- **Required Inputs**: `sender_account_id`, `receiver_account_id`, past 60-day counterparty set.
- **Calculation Window**: 24-hour rolling window.
- **Logic & Configurable Thresholds**:
  - Count of novel counterparties within 24 hours $\ge 6$.
- **Weight**: 20 points.
- **Evidence Returned**:
  ```json
  {
    "window_hours": 24,
    "distinct_new_counterparties": 8,
    "threshold": 6,
    "sample_receivers": ["ACC-IND-9012", "ACC-IND-9013", "ACC-IND-9014"]
  }
  ```
- **Expected False Positives**: Wedding gifting, crowdfunded donation campaign, gig-economy contractor disbursements.
- **Test Cases**: `test_r04_triggers_on_diverse_burst`, `test_r04_repeats_to_known_counterparties_pass`.

---

### 5. `RULE_FAN_IN_SMURFING` (R05: Fan-In / Smurfing Pattern)
- **Rule ID**: `R05_FAN_IN_SMURFING`
- **Purpose & Risk Hypothesis**: Multiple smaller transfers from disparate accounts aggregated into a single collector account within a tight temporal window (smurfing / structuring).
- **Required Inputs**: `receiver_account_id`, inbound transfers.
- **Calculation Window**: 2 hours rolling window.
- **Logic & Configurable Thresholds**:
  - Distinct inbound senders $\ge 4$ within 2 hours.
  - Aggregated incoming total $\ge ₹3,00,000$.
- **Weight**: 35 points.
- **Evidence Returned**:
  ```json
  {
    "receiver_account_id": "ACC-IND-MULE-01",
    "unique_senders_count": 6,
    "aggregated_inflow_inr": 490000.0,
    "window_hours": 2
  }
  ```
- **Expected False Positives**: E-commerce merchant sales, group dining bill splits, tuition fee collections.
- **Test Cases**: `test_r05_detects_smurfing_aggregation`, `test_r05_single_large_sender_ignored`.

---

### 6. `RULE_CIRCULAR_TRANSFER` (R06: Circular Layering Loop)
- **Rule ID**: `R06_CIRCULAR_TRANSFER`
- **Purpose & Risk Hypothesis**: Funds routed through intermediate accounts that ultimately return to the originating entity or affiliate ($A \to B \to C \to A$) is an intentional layering technique to obscure origin.
- **Required Inputs**: Network directed graph paths, transaction timestamps.
- **Calculation Window**: 7-day sliding graph window, cycle length $3 \le k \le 5$.
- **Logic & Configurable Thresholds**:
  - Directed cycle exists in $G$ with monotonically increasing timestamps.
  - Minimum transfer along cycle $\ge ₹50,000$.
- **Weight**: 40 points.
- **Evidence Returned**:
  ```json
  {
    "cycle_path": ["ACC-IND-1001", "ACC-IND-2002", "ACC-IND-3003", "ACC-IND-1001"],
    "cycle_length": 3,
    "min_hop_amount_inr": 150000.0,
    "duration_hours": 14.2
  }
  ```
- **Expected False Positives**: Intercompany liquidity sweeps between corporate subsidiaries.
- **Test Cases**: `test_r06_finds_directed_triangle_cycle`, `test_r06_linear_chain_does_not_fire`.

---

### 7. `RULE_DORMANT_SPIKE` (R07: Dormant Account Sudden Reactivation)
- **Rule ID**: `R07_DORMANT_SPIKE`
- **Purpose & Risk Hypothesis**: An account with zero transaction activity for $> 90$ days suddenly executes high-value transfers, indicative of sleeper mule accounts being "woken up" for money laundering campaigns.
- **Required Inputs**: `account_id`, last activity timestamp, current transaction amount.
- **Calculation Window**: 90-day inactivity threshold.
- **Logic & Configurable Thresholds**:
  - Prior dormancy $> 90$ days AND current transfer amount $\ge ₹2,50,000$.
- **Weight**: 25 points.
- **Evidence Returned**:
  ```json
  {
    "days_since_last_activity": 124,
    "current_transfer_inr": 350000.0,
    "dormancy_threshold_days": 90
  }
  ```
- **Expected False Positives**: Customer returning from abroad, seasonal agriculture income deposit.
- **Test Cases**: `test_r07_triggers_on_dormant_reactivation`, `test_r07_active_account_bypasses`.
