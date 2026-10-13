import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  FolderGit2,
  Network,
  ArrowRight,
  ExternalLink,
  X,
  FileText
} from 'lucide-react';
import { Alert } from '../types';
import { api } from '../api/client';
import { formatINR, formatDateTime, getPriorityBadge } from '../utils/formatters';

interface AlertsViewProps {
  onInspectInGraph: (accId: string) => void;
  onInspectTransaction: (txId: string) => void;
  onCreateCaseFromAlert: (alert: Alert) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  onInspectInGraph,
  onInspectTransaction,
  onCreateCaseFromAlert
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getAlerts({
        priority: priorityFilter || undefined,
        status: statusFilter || undefined
      });
      setAlerts(res.items);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [priorityFilter, statusFilter]);

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    try {
      await api.updateAlert(alertId, newStatus);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to update alert', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Alert Queue & Triage</span>
            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-200">
              {alerts.length} ALERTS
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Prioritized real-time alerts generated from rule violations, cyclical layering, and smurfing detection.
          </p>
        </div>

        {/* Priority Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 font-semibold text-slate-700"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">CRITICAL (90+)</option>
            <option value="HIGH">HIGH (75-89)</option>
            <option value="MEDIUM">MEDIUM (55-74)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid / List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
            No alerts found matching the selected filter criteria.
          </div>
        ) : (
          alerts.map((al) => {
            const badge = getPriorityBadge(al.priority);
            const breakdown = al.evidence_summary?.breakdown || [];
            return (
              <div
                key={al.alert_id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-mint-300 transition-all space-y-4"
              >
                {/* Top Row: Title, Priority, Status, Score */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg}`}>
                        {al.priority}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-400">{al.alert_id}</span>
                      <span className="text-xs text-slate-400">• {formatDateTime(al.created_at)}</span>
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">{al.title}</h2>
                  </div>

                  <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                    <div className="text-lg font-black text-red-600">{al.risk_score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      al.status === 'OPEN' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      STATUS: {al.status}
                    </span>
                  </div>
                </div>

                {/* Details & Amounts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Account</span>
                    <div className="font-mono font-bold text-slate-900 mt-0.5">{al.account_id}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Associated Amount</span>
                    <div className="font-bold text-slate-900 mt-0.5">{formatINR(al.amount)}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Triggered Rules</span>
                    <div className="font-semibold text-mint-800 mt-0.5">{breakdown.length} Rules Fired</div>
                  </div>
                </div>

                {/* Itemized Evidence Summary */}
                {breakdown.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-1.5">
                    <div className="text-[10px] uppercase font-bold text-amber-800">Triggered AML Hypothesis & Evidence:</div>
                    {breakdown.map((b, i) => (
                      <div key={i} className="text-slate-700 flex items-start space-x-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>
                          <strong className="text-slate-900">{b.rule_name}:</strong> {b.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onInspectInGraph(al.account_id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-200 flex items-center space-x-1.5"
                    >
                      <Network className="w-3.5 h-3.5 text-mint-600" />
                      <span>Inspect Graph</span>
                    </button>

                    {al.transaction_id && (
                      <button
                        onClick={() => onInspectTransaction(al.transaction_id!)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center space-x-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Transaction</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {al.status === 'OPEN' && (
                      <button
                        onClick={() => handleUpdateStatus(al.alert_id, 'RESOLVED')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                      >
                        Dismiss / False Positive
                      </button>
                    )}

                    <button
                      onClick={() => onCreateCaseFromAlert(al)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center space-x-1.5 shadow-sm"
                    >
                      <FolderGit2 className="w-3.5 h-3.5 text-mint-400" />
                      <span>Escalate to Case</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
