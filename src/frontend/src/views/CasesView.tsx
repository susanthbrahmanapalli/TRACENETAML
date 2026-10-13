import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  CheckCircle,
  Clock,
  User,
  Plus,
  Send,
  ShieldAlert,
  ArrowRight,
  History,
  FileCheck2,
  AlertTriangle,
  X
} from 'lucide-react';
import { Case, CaseNote } from '../types';
import { api } from '../api/client';
import { formatDateTime, getPriorityBadge } from '../utils/formatters';

interface CasesViewProps {
  onInspectInGraph: (accId: string) => void;
}

export const CasesView: React.FC<CasesViewProps> = ({ onInspectInGraph }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  
  // Note form
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // New Case Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCasePriority, setNewCasePriority] = useState('HIGH');
  const [newCaseAccount, setNewCaseAccount] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.getCases({ status: statusFilter || undefined });
      setCases(res.items);
      if (res.items.length > 0 && !selectedCase) {
        loadCaseDetail(res.items[0].case_id);
      }
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const loadCaseDetail = async (caseId: string) => {
    try {
      const c = await api.getCaseDetail(caseId);
      setSelectedCase(c);
      const logs = await api.getCaseAudit(caseId);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to get case detail', err);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!selectedCase) return;
    try {
      await api.updateCase(selectedCase.case_id, { status: newStatus });
      loadCaseDetail(selectedCase.case_id);
      fetchCases();
    } catch (err: any) {
      alert(`Transition error: ${err.message}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedCase) return;
    setSubmittingNote(true);
    try {
      await api.addCaseNote(selectedCase.case_id, newNote.trim());
      setNewNote('');
      loadCaseDetail(selectedCase.case_id);
    } catch (err) {
      console.error('Failed to add note', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle.trim()) return;
    try {
      const res = await api.createCase({
        title: newCaseTitle.trim(),
        priority: newCasePriority,
        primary_account_id: newCaseAccount.trim() || undefined,
        initial_note: 'Investigation initiated from compliance portal.'
      });
      setShowNewModal(false);
      setNewCaseTitle('');
      setNewCaseAccount('');
      fetchCases();
      loadCaseDetail(res.case_id);
    } catch (err) {
      console.error('Failed to create case', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Investigation Cases & Audit Trail</span>
            <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-800 text-xs font-semibold border border-mint-200">
              AUDIT COMPLIANT
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Formal human-in-the-loop decision dossiers, analyst rationales, and state-machine transitions.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-mint-500 hover:bg-mint-600 text-white shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* Main Workspace (Split View: Cases List + Case Dossier) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left: Cases List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          {/* Filter */}
          <div className="p-3 border-b border-slate-200 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 text-slate-700"
            >
              <option value="">All Case Statuses</option>
              <option value="NEW">NEW</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="SAR_RECOMMENDED">SAR_RECOMMENDED</option>
              <option value="CLOSED_RESOLVED">CLOSED_RESOLVED</option>
              <option value="CLOSED_FALSE_POSITIVE">CLOSED_FALSE_POSITIVE</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-xs">Loading cases...</div>
            ) : cases.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">No cases matching filter.</div>
            ) : (
              cases.map((c) => {
                const isSelected = selectedCase?.case_id === c.case_id;
                return (
                  <div
                    key={c.case_id}
                    onClick={() => loadCaseDetail(c.case_id)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-mint-50/70 border-l-4 border-l-mint-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-slate-900">{c.case_reference}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 line-clamp-1">{c.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{c.assigned_analyst || 'Unassigned'}</span>
                      <span>{c.alerts_count || 0} Alerts</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Case Dossier (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-y-auto p-6 space-y-6">
          {selectedCase ? (
            <>
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded border border-slate-200">
                      {selectedCase.case_reference}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-800 border border-mint-200">
                      {selectedCase.status}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedCase.title}</h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Lead Analyst: <strong>{selectedCase.assigned_analyst}</strong> • Created: {formatDateTime(selectedCase.created_at)}
                  </div>
                </div>

                {selectedCase.primary_account_id && (
                  <button
                    onClick={() => onInspectInGraph(selectedCase.primary_account_id!)}
                    className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-200 flex items-center space-x-1.5"
                  >
                    <span>Inspect Account {selectedCase.primary_account_id}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* State Machine Transition Controls */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Adjudication State Machine Controls
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCase.status === 'NEW' && (
                    <button
                      onClick={() => handleStatusTransition('UNDER_REVIEW')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-mint-600 hover:bg-mint-700 text-white"
                    >
                      Begin Review (Under Review)
                    </button>
                  )}

                  {selectedCase.status === 'UNDER_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleStatusTransition('ESCALATED')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Escalate to Senior Officer
                      </button>
                      <button
                        onClick={() => handleStatusTransition('SAR_RECOMMENDED')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white"
                      >
                        Recommend STR / SAR Filing (FIU-IND)
                      </button>
                      <button
                        onClick={() => handleStatusTransition('CLOSED_RESOLVED')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white"
                      >
                        Close Case (Resolved)
                      </button>
                      <button
                        onClick={() => handleStatusTransition('CLOSED_FALSE_POSITIVE')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
                      >
                        Close as False Positive
                      </button>
                    </>
                  )}

                  {(selectedCase.status === 'CLOSED_RESOLVED' || selectedCase.status === 'CLOSED_FALSE_POSITIVE') && (
                    <button
                      onClick={() => handleStatusTransition('UNDER_REVIEW')}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-mint-600 hover:bg-mint-700 text-white"
                    >
                      Reopen Investigation Case
                    </button>
                  )}
                </div>
              </div>

              {/* Linked Alerts */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Attached Alerts ({selectedCase.alerts?.length || 0})
                </div>
                {selectedCase.alerts && selectedCase.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCase.alerts.map((al) => (
                      <div key={al.alert_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-slate-800">{al.title}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{al.alert_id}</div>
                        </div>
                        <span className="font-bold text-red-600">{al.risk_score.toFixed(1)} Score</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-400 italic">No alerts linked to this case yet.</div>
                )}
              </div>

              {/* Investigator Notes */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Investigative Notes & Rationale
                </div>

                {/* Add Note Input */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter compliance finding, transaction rationale, or regulatory recommendation..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !newNote.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-mint-500 hover:bg-mint-600 text-white flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Append Note</span>
                    </button>
                  </div>
                </form>

                {/* Notes History */}
                <div className="space-y-2 pt-2">
                  {selectedCase.notes?.map((n) => (
                    <div key={n.note_id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700">{n.author}</span>
                        <span>{formatDateTime(n.created_at)}</span>
                      </div>
                      <p className="text-slate-800">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-mint-600" />
                  <span>Immutable Case Audit History</span>
                </div>

                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.audit_id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center font-mono">
                      <div>
                        <span className="font-bold text-mint-800">{log.action}:</span> {log.description}
                      </div>
                      <span className="text-[10px] text-slate-400">{formatDateTime(log.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Select a case from the queue to review full investigation dossier.
            </div>
          )}
        </div>
      </div>

      {/* New Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Create New Investigation Case</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCase} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Case Title</label>
                <input
                  type="text"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. Circular Routing Ring - Account ACC-IND-0021"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Target Account ID</label>
                <input
                  type="text"
                  value={newCaseAccount}
                  onChange={(e) => setNewCaseAccount(e.target.value)}
                  placeholder="e.g. ACC-IND-0021"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={newCasePriority}
                  onChange={(e) => setNewCasePriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-mint-500 text-white hover:bg-mint-600 shadow-sm"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
