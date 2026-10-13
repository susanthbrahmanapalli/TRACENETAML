export interface Transaction {
  transaction_id: string;
  sender_account_id: string;
  receiver_account_id: string;
  amount: number;
  currency: string;
  timestamp: string;
  transaction_type: string;
  status: string;
  channel: string;
  description?: string;
  risk_score?: number;
  risk_priority?: string;
  ground_truth_label?: string;
  scenario_id?: string;
  created_at: string;
}

export interface RuleEvidenceItem {
  rule_id: string;
  rule_name: string;
  weight: number;
  description: string;
  evidence: Record<string, any>;
}

export interface AssessmentData {
  assessment_id: string;
  score: number;
  priority: string;
  triggered_rules: string[];
  evidence: {
    triggered_rules_count: number;
    breakdown: RuleEvidenceItem[];
    evaluated_at: string;
  };
  evaluated_at: string;
}

export interface Alert {
  alert_id: string;
  transaction_id?: string;
  assessment_id?: string;
  account_id: string;
  counterparty_id?: string;
  amount: number;
  priority: string;
  risk_score: number;
  status: string;
  title: string;
  evidence_summary: {
    triggered_rules_count: number;
    breakdown: RuleEvidenceItem[];
  };
  case_id?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseNote {
  note_id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface Case {
  case_id: string;
  case_reference: string;
  title: string;
  status: string;
  priority: string;
  primary_account_id?: string;
  assigned_analyst?: string;
  resolution_rationale?: string;
  created_at: string;
  updated_at: string;
  alerts_count?: number;
  notes_count?: number;
  alerts?: Alert[];
  notes?: CaseNote[];
}

export interface GraphNode {
  id: string;
  label: string;
  account_type: string;
  risk_score: number;
  total_inflow: number;
  total_outflow: number;
  degree: number;
  is_focal: boolean;
  is_flagged: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  currency: string;
  channel: string;
  timestamp: string;
  transaction_id: string;
  is_part_of_cycle: boolean;
}

export interface CyclePath {
  path: string[];
  length: number;
  total_amount: number;
  duration_hours: number;
  transaction_ids: string[];
}

export interface GraphNetworkResponse {
  focal_account_id?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  detected_cycles: CyclePath[];
  total_nodes: number;
  total_edges: number;
}

export interface EvaluationResponse {
  dataset_name: string;
  sample_size: number;
  positive_class_count: number;
  negative_class_count: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  latency_ms_per_txn: number;
  confusion_matrix: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
  baseline_comparison: {
    baseline_model: string;
    baseline_precision: number;
    baseline_recall: number;
    baseline_f1_score: number;
    tracenet_f1_improvement_pct: number;
    explanation: string;
  };
  eval_timestamp: string;
}

export interface OverviewStats {
  total_transactions: number;
  total_volume_inr: number;
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  open_cases: number;
  resolved_cases: number;
  recent_transactions: Transaction[];
  top_flagged_accounts: {
    account_id: string;
    account_name: string;
    account_type: string;
    kyc_status: string;
    risk_score: number;
    is_flagged: boolean;
  }[];
}

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
}
