import React, { useState } from 'react';
import { ShieldCheck, Lock, User as UserIcon, ArrowRight, Sparkles, Building2 } from 'lucide-react';
import { User } from '../types';
import { api } from '../api/client';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('analyst_priya');
  const [password, setPassword] = useState('demo123');
  const [role, setRole] = useState('ANALYST_L2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError('Please enter your Compliance Username / ID');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your secret password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(username, role);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (user: string, r: string) => {
    setUsername(user);
    setPassword('demo123');
    setRole(r);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mint-50/70 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-mint-900/5 border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 text-center bg-gradient-to-b from-mint-50/40 to-transparent">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-mint-600 to-mint-400 flex items-center justify-center text-white shadow-lg shadow-mint-500/25 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TraceNet Platform</h1>
          <p className="text-xs text-slate-500 mt-1">Real-Time Fraud & AML Risk Orchestration</p>
          <div className="inline-flex items-center space-x-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-800 text-[11px] font-medium border border-mint-200">
            <Building2 className="w-3 h-3" />
            <span>Authorized Bank Personnel Only</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Compliance Analyst ID / Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. analyst_priya"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Passphrase / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Clearance / Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500 focus:border-mint-500"
            >
              <option value="ANALYST_L2">AML Compliance Analyst (Level 2)</option>
              <option value="ANALYST_L1">Triage Specialist (Level 1)</option>
              <option value="MLRO">MLRO / Senior Compliance Lead</option>
              <option value="RISK_ENGINEER">Risk Strategy Engineer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-mint-500 hover:bg-mint-600 active:bg-mint-700 text-white font-semibold text-sm transition-all shadow-md shadow-mint-500/25 disabled:opacity-60"
          >
            {loading ? (
              <span>Authenticating Credentials...</span>
            ) : (
              <>
                <span>Enter Compliance Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Quick Demo Auto-Fill
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('analyst_priya', 'ANALYST_L2')}
                className="p-2 text-xs text-left rounded-lg bg-mint-50/70 hover:bg-mint-100 border border-mint-200 text-mint-900 transition-colors"
              >
                <div className="font-semibold flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-mint-600" />
                  <span>Priya Sharma</span>
                </div>
                <div className="text-[10px] text-slate-500">Analyst L2</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('mlro_supervisor', 'MLRO')}
                className="p-2 text-xs text-left rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 transition-colors"
              >
                <div className="font-semibold flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-slate-600" />
                  <span>Vikram Singh</span>
                </div>
                <div className="text-[10px] text-slate-500">MLRO Lead</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
