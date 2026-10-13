import {
  OverviewStats,
  Transaction,
  AssessmentData,
  Alert,
  Case,
  CaseNote,
  GraphNetworkResponse,
  CyclePath,
  EvaluationResponse,
  User
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.detail || err.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Stats
  async getOverviewStats(): Promise<OverviewStats> {
    const res = await fetch(`${API_BASE}/stats/overview`);
    return handleResponse<OverviewStats>(res);
  },

  // Auth
  async login(username: string, role: string = 'ANALYST_L2'): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'password', role })
    });
    return handleResponse<{ user: User; token: string }>(res);
  },

  // Transactions
  async getTransactions(params?: {
    search?: string;
    channel?: string;
    status?: string;
    min_amount?: number;
    skip?: number;
    limit?: number;
  }): Promise<{ total: number; items: Transaction[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.channel) query.append('channel', params.channel);
    if (params?.status) query.append('status', params.status);
    if (params?.min_amount) query.append('min_amount', params.min_amount.toString());
    if (params?.skip !== undefined) query.append('skip', params.skip.toString());
    if (params?.limit !== undefined) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/transactions?${query.toString()}`);
    return handleResponse<{ total: number; items: Transaction[] }>(res);
  },

  async getTransactionDetail(id: string): Promise<{ transaction: Transaction; assessment: AssessmentData | null }> {
    const res = await fetch(`${API_BASE}/transactions/${id}`);
    return handleResponse<{ transaction: Transaction; assessment: AssessmentData | null }>(res);
  },

  // Alerts
  async getAlerts(params?: { priority?: string; status?: string }): Promise<{ total: number; items: Alert[] }> {
    const query = new URLSearchParams();
    if (params?.priority) query.append('priority', params.priority);
    if (params?.status) query.append('status', params.status);
    const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
    return handleResponse<{ total: number; items: Alert[] }>(res);
  },

  async updateAlert(alertId: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE}/alerts/${alertId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  // Cases
  async getCases(params?: { status?: string; priority?: string }): Promise<{ total: number; items: Case[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.priority) query.append('priority', params.priority);
    const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
    return handleResponse<{ total: number; items: Case[] }>(res);
  },

  async getCaseDetail(caseId: string): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${caseId}`);
    return handleResponse<Case>(res);
  },

  async createCase(data: {
    title: string;
    priority: string;
    primary_account_id?: string;
    alert_ids?: string[];
    initial_note?: string;
  }): Promise<{ case_id: string; case_reference: string }> {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCase(caseId: string, data: { status?: string; priority?: string; resolution_rationale?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/cases/${caseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async addCaseNote(caseId: string, content: string): Promise<CaseNote> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    return handleResponse(res);
  },

  async getCaseAudit(caseId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/audit`);
    return handleResponse<any[]>(res);
  },

  // Live Graph
  async getGraphNetwork(params?: { focal_account_id?: string; depth?: number; max_nodes?: number }): Promise<GraphNetworkResponse> {
    const query = new URLSearchParams();
    if (params?.focal_account_id) query.append('focal_account_id', params.focal_account_id);
    if (params?.depth) query.append('depth', params.depth.toString());
    if (params?.max_nodes) query.append('max_nodes', params.max_nodes.toString());
    const res = await fetch(`${API_BASE}/graph/network?${query.toString()}`);
    return handleResponse<GraphNetworkResponse>(res);
  },

  async getGraphCycles(): Promise<{ count: number; cycles: CyclePath[] }> {
    const res = await fetch(`${API_BASE}/graph/cycles`);
    return handleResponse(res);
  },

  // Evaluation
  async runEvaluation(): Promise<EvaluationResponse> {
    const res = await fetch(`${API_BASE}/evaluation/run`);
    return handleResponse<EvaluationResponse>(res);
  },

  // Ingestion & Demo
  async importCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/transactions/import`, {
      method: 'POST',
      body: formData
    });
    return handleResponse(res);
  },

  async reseedDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/generate`, { method: 'POST' });
    return handleResponse(res);
  },

  async streamStep(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/stream-step`, { method: 'POST' });
    return handleResponse(res);
  }
};
