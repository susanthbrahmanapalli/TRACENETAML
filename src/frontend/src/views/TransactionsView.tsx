import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Clock,
  Layers,
  CheckCircle2,
  X,
  Network
} from 'lucide-react';
import { Transaction, AssessmentData } from '../types';
import { api } from '../api/client';
import { formatINR, formatDateTime, getPriorityBadge } from '../utils/formatters';

interface TransactionsViewProps {
  initialTxnId?: string | null;
  onInspectInGraph: (accId: string) => void;
  onCreateCaseForTxn: (txn: Transaction) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  initialTxnId,
  onInspectInGraph,
  onCreateCaseForTxn
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [minAmount, setMinAmount] = useState<number | undefined>();

  // Detail Drawer
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentData | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchTxns = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions({
        search: search.trim() || undefined,
        channel: channel || undefined,
        status: status || undefined,
        min_amount: minAmount,
        limit: 100
      });
      setTransactions(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxns();
  }, [channel, status, minAmount]);

  useEffect(() => {
    if (initialTxnId) {
      openDetailDrawer(initialTxnId);
    }
  }, [initialTxnId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTxns();
  };

  const openDetailDrawer = async (txId: string) => {
    setDrawerLoading(true);
    try {
      const res = await api.getTransactionDetail(txId);
      setSelectedTxn(res.transaction);
      setSelectedAssessment(res.assessment);
    } catch (err) {
      console.error('Failed to get txn detail', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transaction Explorer</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and audit individual fund transfers with itemized rule-based explanations.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing <span className="font-bold text-slate-800">{transactions.length}</span> of {total} records
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID, Account ID, or Narration..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 text-slate-700"
            >
              <option value="">All Channels</option>
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
            </select>

            <select
              value={minAmount === undefined ? '' : minAmount.toString()}
              onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 text-slate-700 font-mono"
            >
              <option value="">Amount: Any</option>
              <option value="50000">₹50,000+</option>
              <option value="100000">₹1,00,000+ (1 Lakh)</option>
              <option value="500000">₹5,00,000+ (5 Lakhs)</option>
              <option value="1000000">₹10,00,000+ (10 Lakhs)</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REVERSED">REVERSED</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-mint-500 hover:bg-mint-600 text-white shadow-sm transition-all"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Debit Account</th>
                <th className="py-3.5 px-4">Credit Account</th>
                <th className="py-3.5 px-4">Amount (INR)</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Risk Evaluation</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No transactions matching your criteria. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const badge = getPriorityBadge(tx.risk_priority || 'LOW');
                  return (
                    <tr
                      key={tx.transaction_id}
                      onClick={() => openDetailDrawer(tx.transaction_id)}
                      className="hover:bg-mint-50/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">{tx.transaction_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{tx.sender_account_id}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{tx.receiver_account_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{formatINR(tx.amount)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === 'COMPLETED' ? 'bg-mint-100 text-mint-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(tx.timestamp)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          <span>{tx.risk_score ? `${tx.risk_score.toFixed(0)} (${tx.risk_priority})` : 'PASS'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailDrawer(tx.transaction_id);
                          }}
                          className="px-2 py-1 text-xs font-semibold text-mint-700 hover:text-white hover:bg-mint-600 rounded-lg border border-mint-200 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Inspection Drawer */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-semibold text-mint-700 bg-mint-50 px-2 py-0.5 rounded border border-mint-200">
                  {selectedTxn.channel} TRANSFER
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedTxn.transaction_id}</h2>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onInspectInGraph(selectedTxn.sender_account_id)}
                className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-mint-50 hover:bg-mint-100 border border-mint-300 text-mint-900 text-xs font-semibold transition-colors"
              >
                <Network className="w-4 h-4 text-mint-600" />
                <span>Inspect in Graph</span>
              </button>

              <button
                onClick={() => onCreateCaseForTxn(selectedTxn)}
                className="flex items-center justify-center space-x-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="w-4 h-4 text-mint-400" />
                <span>Create Investigation Case</span>
              </button>
            </div>

            {/* Transaction Data Cards */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Transaction Core Values
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] text-slate-400">Transfer Amount</div>
                  <div className="text-lg font-bold text-slate-900">{formatINR(selectedTxn.amount)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Timestamp (IST)</div>
                  <div className="text-xs font-semibold text-slate-800">{formatDateTime(selectedTxn.timestamp)}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Debited Account (Sender)</div>
                  <div className="text-xs font-mono font-bold text-slate-900">{selectedTxn.sender_account_id}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Credited Account (Receiver)</div>
                  <div className="text-xs font-mono font-bold text-slate-900">{selectedTxn.receiver_account_id}</div>
                </div>
              </div>
              {selectedTxn.description && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[11px] text-slate-400">Narration / Memo</div>
                  <div className="text-xs text-slate-700 italic">"{selectedTxn.description}"</div>
                </div>
              )}
            </div>

            {/* Explainable Risk Assessment Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Risk Engine Assessment
                </h3>
                {selectedAssessment && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadge(selectedAssessment.priority).bg}`}>
                    Score: {selectedAssessment.score.toFixed(1)} / 100 ({selectedAssessment.priority})
                  </span>
                )}
              </div>

              {selectedAssessment && selectedAssessment.evidence?.breakdown?.length > 0 ? (
                <div className="space-y-3">
                  {selectedAssessment.evidence.breakdown.map((rule, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs text-amber-900 flex items-center space-x-1.5">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          <span>{rule.rule_name}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-700">+{rule.weight} pts</span>
                      </div>
                      <p className="text-xs text-slate-700">{rule.description}</p>
                      
                      {/* Structured Evidence Payload */}
                      <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 font-mono text-[11px] text-slate-600 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Calculated Evidence:</div>
                        {Object.entries(rule.evidence).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-slate-500">{k}:</span>
                            <span className="font-semibold text-slate-800">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-mint-50/60 border border-mint-200 text-mint-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-mint-600 shrink-0" />
                  <span>No suspicious AML/Fraud rule triggers detected. Transaction passed baseline velocity and network checks.</span>
                </div>
              )}
            </div>

            {/* Ground Truth Scenario Label (if present) */}
            {selectedTxn.ground_truth_label && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700 flex items-center space-x-1">
                  <span>Evaluation Ground Truth Label:</span>
                  <span className="font-mono text-mint-800 bg-mint-50 px-1 rounded border border-mint-200">{selectedTxn.ground_truth_label}</span>
                </div>
                <div className="text-[11px]">Scenario: {selectedTxn.scenario_id}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
