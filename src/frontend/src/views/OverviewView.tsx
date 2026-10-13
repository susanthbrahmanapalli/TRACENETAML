import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  FolderGit2,
  CheckCircle2,
  IndianRupee,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { OverviewStats, Transaction } from '../types';
import { api } from '../api/client';
import { formatINR, formatCompactINR, formatDateTime, getPriorityBadge } from '../utils/formatters';

interface OverviewViewProps {
  onViewTransaction: (txId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onViewTransaction, onNavigateTab }) => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await api.getOverviewStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load overview stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Title & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Operations Overview</span>
            <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-800 text-xs font-semibold border border-mint-200">
              ₹ INR LEDGER
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time telemetry, transaction flows, and risk distribution across Indian banking nodes.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-mint-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Volume INR */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-mint-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Monitored Volume</span>
            <div className="p-2 rounded-lg bg-mint-50 text-mint-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatINR(stats?.total_volume_inr || 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
            <span className="font-semibold text-mint-700">{formatCompactINR(stats?.total_volume_inr || 0)}</span>
            <span>across all payment channels</span>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-mint-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Transactions Processed</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.total_transactions.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-xs text-mint-700 font-medium mt-1">
            100% Schema & Timestamp Validated
          </div>
        </div>

        {/* Active Alerts */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-mint-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Alerts Generated</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.total_alerts || 0}
          </div>
          <div className="text-xs text-amber-700 font-medium mt-1">
            {stats?.critical_alerts || 0} Critical Priority Flagged
          </div>
        </div>

        {/* Active Cases */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-mint-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold tracking-wider uppercase">Investigation Cases</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.open_cases || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats?.resolved_cases || 0} Cases Resolved with Rationale
          </div>
        </div>
      </div>

      {/* Alert Priority Breakdown & Action Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Alert Severity Distribution
            </h2>
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-xs font-semibold text-mint-700 hover:text-mint-800 flex items-center space-x-1"
            >
              <span>View Full Queue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-red-50/70 border border-red-200">
              <div className="text-xs font-bold text-red-800 uppercase">Critical (90+)</div>
              <div className="text-2xl font-black text-red-600 mt-1">{stats?.critical_alerts || 0}</div>
              <p className="text-[11px] text-red-700/80 mt-1">Immediate layering, cycles & smurfing</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <div className="text-xs font-bold text-amber-800 uppercase">High (75-89)</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats?.high_alerts || 0}</div>
              <p className="text-[11px] text-amber-700/80 mt-1">Rapid velocity bursts & dormant spikes</p>
            </div>

            <div className="p-4 rounded-xl bg-yellow-50/70 border border-yellow-200">
              <div className="text-xs font-bold text-yellow-800 uppercase">Medium (55-74)</div>
              <div className="text-2xl font-black text-yellow-600 mt-1">{stats?.medium_alerts || 0}</div>
              <p className="text-[11px] text-yellow-700/80 mt-1">Unusual counterparty diversity</p>
            </div>
          </div>
        </div>

        {/* High Risk Accounts Preview */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Top Flagged Entities
            </h2>
            <button
              onClick={() => onNavigateTab('graph')}
              className="text-xs font-semibold text-mint-700 hover:text-mint-800 flex items-center space-x-1"
            >
              <span>Inspect in Graph</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {stats?.top_flagged_accounts.map((acc) => (
              <div
                key={acc.account_id}
                onClick={() => onNavigateTab('graph')}
                className="p-2.5 rounded-xl border border-slate-100 hover:border-mint-300 hover:bg-mint-50/30 flex items-center justify-between cursor-pointer transition-all"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                    <span>{acc.account_name}</span>
                    {acc.is_flagged && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-100 text-red-700 font-bold">MULE</span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{acc.account_id}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-red-600">{acc.risk_score.toFixed(1)}</div>
                  <div className="text-[10px] text-slate-400">Score</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Flagged Activity Stream */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recent Transactions & Real-Time Risk Evaluations
            </h2>
            <p className="text-xs text-slate-500">Live stream entries analyzed through TraceNet's 7-rule engine</p>
          </div>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-semibold text-mint-700 hover:text-mint-800 flex items-center space-x-1"
          >
            <span>View All Transactions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <th className="pb-3">Transaction ID</th>
                <th className="pb-3">Sender (Debit)</th>
                <th className="pb-3">Receiver (Credit)</th>
                <th className="pb-3">Amount (INR)</th>
                <th className="pb-3">Channel</th>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Risk Assessment</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.recent_transactions.map((tx) => {
                const badge = getPriorityBadge(tx.risk_priority || 'LOW');
                return (
                  <tr key={tx.transaction_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-mono font-medium text-slate-800">{tx.transaction_id}</td>
                    <td className="py-3 font-mono text-slate-600">{tx.sender_account_id}</td>
                    <td className="py-3 font-mono text-slate-600">{tx.receiver_account_id}</td>
                    <td className="py-3 font-bold text-slate-900">{formatINR(tx.amount)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {tx.channel}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{formatDateTime(tx.timestamp)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                        <span>{tx.risk_score ? `${tx.risk_score.toFixed(0)} - ${tx.risk_priority}` : 'EVALUATED'}</span>
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onViewTransaction(tx.transaction_id)}
                        className="px-2 py-1 text-xs font-semibold text-mint-700 hover:text-white hover:bg-mint-600 rounded-lg border border-mint-200 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
