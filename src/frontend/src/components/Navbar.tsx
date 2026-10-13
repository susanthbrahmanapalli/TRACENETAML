import React, { useState } from 'react';
import { ShieldAlert, Activity, Play, CheckCircle, UserCheck, LogOut, Radio } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onStreamEvent: () => void;
  isStreaming: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, onStreamEvent, isStreaming }) => {
  const [streamCount, setStreamCount] = useState(0);

  const handleSimulate = async () => {
    onStreamEvent();
    setStreamCount(prev => prev + 1);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mint-600 to-mint-400 flex items-center justify-center text-white shadow-md shadow-mint-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">TraceNet</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-mint-100 text-mint-800 border border-mint-200">
                AML ORCHESTRATOR
              </span>
            </div>
            <p className="text-xs text-slate-500">Real-Time Risk & Financial Crime Decision Support</p>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-mint-500 radar-mint"></span>
            <span className="text-xs font-medium text-slate-700">Live Indian Banking Stream</span>
            <span className="text-xs font-mono font-bold text-mint-700 bg-mint-50 px-1.5 py-0.5 rounded border border-mint-200">
              ₹ INR
            </span>
          </div>

          {/* Simulate Event Button */}
          <button
            onClick={handleSimulate}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-300 transition-colors shadow-sm active:scale-95"
            title="Inject real-time transaction event"
          >
            <Radio className="w-3.5 h-3.5 text-mint-600 animate-pulse" />
            <span>Simulate Stream Event</span>
            {streamCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-mint-200 text-mint-900 font-mono text-[10px]">
                +{streamCount}
              </span>
            )}
          </button>
        </div>

        {/* User Pill & Logout */}
        <div className="flex items-center space-x-3">
          {currentUser ? (
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-mint-100 border border-mint-300 flex items-center justify-center text-mint-700 font-semibold text-xs">
                {currentUser.full_name?.charAt(0) || 'A'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-800">{currentUser.full_name}</div>
                <div className="text-[10px] text-mint-700 font-medium">{currentUser.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors ml-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">Demo Session Active</div>
          )}
        </div>
      </div>
    </header>
  );
};
