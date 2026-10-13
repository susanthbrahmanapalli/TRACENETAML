import React, { useState, useEffect } from 'react';
import { User, Alert, Transaction } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { WebsiteHero } from './components/WebsiteHero';
import { OverviewView } from './views/OverviewView';
import { TransactionsView } from './views/TransactionsView';
import { GraphView } from './views/GraphView';
import { AlertsView } from './views/AlertsView';
import { CasesView } from './views/CasesView';
import { EvaluationView } from './views/EvaluationView';
import { DataManagementView } from './views/DataManagementView';
import { api } from './api/client';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tracenet_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [inspectTxnId, setInspectTxnId] = useState<string | null>(null);
  const [inspectAccountId, setInspectAccountId] = useState<string | null>(null);
  const [openAlertsCount, setOpenAlertsCount] = useState<number>(0);
  const [openCasesCount, setOpenCasesCount] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [showLoginForm, setShowLoginForm] = useState<boolean>(false);

  // Load telemetry counts
  const refreshBadgeCounts = async () => {
    try {
      const stats = await api.getOverviewStats();
      setOpenAlertsCount(stats.total_alerts);
      setOpenCasesCount(stats.open_cases);
    } catch (err) {
      console.error('Failed to refresh badge counts', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      refreshBadgeCounts();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('tracenet_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tracenet_user');
  };

  // Cross-screen navigation helpers
  const handleInspectTransaction = (txId: string) => {
    setInspectTxnId(txId);
    setCurrentTab('transactions');
  };

  const handleInspectInGraph = (accId: string) => {
    setInspectAccountId(accId);
    setCurrentTab('graph');
  };

  const handleCreateCaseFromAlert = async (targetAlert: Alert) => {
    try {
      const res = await api.createCase({
        title: `Investigation: ${targetAlert.title}`,
        priority: targetAlert.priority,
        primary_account_id: targetAlert.account_id,
        alert_ids: [targetAlert.alert_id],
        initial_note: `Automated case created from alert ${targetAlert.alert_id}. Risk score: ${targetAlert.risk_score.toFixed(1)}.`
      });
      refreshBadgeCounts();
      setCurrentTab('cases');
    } catch (err: any) {
      window.alert(`Failed to create case: ${err.message}`);
    }
  };

  const handleCreateCaseForTxn = async (txn: Transaction) => {
    try {
      const res = await api.createCase({
        title: `Investigation for Transaction ${txn.transaction_id}`,
        priority: txn.risk_priority || 'HIGH',
        primary_account_id: txn.sender_account_id,
        initial_note: `Manual escalation from Transaction Explorer. Amount: ${txn.amount} INR.`
      });
      refreshBadgeCounts();
      setCurrentTab('cases');
    } catch (err: any) {
      window.alert(`Failed to create case: ${err.message}`);
    }
  };

  const handleStreamStep = async () => {
    setIsStreaming(true);
    try {
      await api.streamStep();
      refreshBadgeCounts();
    } catch (err) {
      console.error('Stream simulation error', err);
    } finally {
      setTimeout(() => setIsStreaming(false), 800);
    }
  };

  // If unauthenticated, show Website Hero landing page with option to open Login
  if (!currentUser) {
    if (!showLoginForm) {
      return (
        <WebsiteHero
          onEnterPlatform={() => setShowLoginForm(true)}
          showNavAction={true}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onBackToShowcase={() => setShowLoginForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onStreamEvent={handleStreamStep}
        isStreaming={isStreaming}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'transactions') setInspectTxnId(null);
            if (tab !== 'graph') setInspectAccountId(null);
          }}
          openAlertsCount={openAlertsCount}
          openCasesCount={openCasesCount}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentTab === 'hero' && (
            <div className="relative w-full h-[calc(100vh-4rem)] bg-white overflow-hidden">
              <WebsiteHero onEnterPlatform={() => setCurrentTab('overview')} showNavAction={false} />
              <div className="absolute top-4 right-6 z-30">
                <button
                  onClick={() => setCurrentTab('overview')}
                  className="px-4 py-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold backdrop-blur shadow-md transition-all cursor-pointer"
                >
                  &larr; Return to Operations Overview
                </button>
              </div>
            </div>
          )}

          {currentTab === 'overview' && (
            <OverviewView
              onViewTransaction={handleInspectTransaction}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              initialTxnId={inspectTxnId}
              onInspectInGraph={handleInspectInGraph}
              onCreateCaseForTxn={handleCreateCaseForTxn}
            />
          )}

          {currentTab === 'graph' && (
            <GraphView
              initialAccountId={inspectAccountId}
              onOpenCase={(accId) => {
                handleInspectInGraph(accId);
                setCurrentTab('cases');
              }}
            />
          )}

          {currentTab === 'alerts' && (
            <AlertsView
              onInspectInGraph={handleInspectInGraph}
              onInspectTransaction={handleInspectTransaction}
              onCreateCaseFromAlert={handleCreateCaseFromAlert}
            />
          )}

          {currentTab === 'cases' && (
            <CasesView
              onInspectInGraph={handleInspectInGraph}
            />
          )}

          {currentTab === 'evaluation' && (
            <EvaluationView />
          )}

          {currentTab === 'import' && (
            <DataManagementView
              onRefreshAll={refreshBadgeCounts}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
