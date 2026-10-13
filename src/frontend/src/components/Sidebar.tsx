import React from 'react';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Network,
  AlertTriangle,
  FolderGit2,
  Cpu,
  UploadCloud,
  FileCheck2,
  PlayCircle
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  openAlertsCount: number;
  openCasesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openAlertsCount,
  openCasesCount
}) => {
  const navItems = [
    { id: 'hero', label: 'Website Hero Loop', icon: PlayCircle, badge: '6s LOOP' },
    { id: 'overview', label: 'Operations Overview', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transaction Explorer', icon: ArrowRightLeft },
    { id: 'graph', label: 'Live Graph Intel', icon: Network, badge: 'LIVE' },
    { id: 'alerts', label: 'Alert Queue', icon: AlertTriangle, count: openAlertsCount },
    { id: 'cases', label: 'Case Investigation', icon: FolderGit2, count: openCasesCount },
    { id: 'evaluation', label: 'Evaluation Lab', icon: Cpu },
    { id: 'import', label: 'Data Ingestion & Demo', icon: UploadCloud },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Compliance Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-mint-500 text-white shadow-sm shadow-mint-500/25 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-mint-50/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-mint-600'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-mint-600 text-white' : 'bg-mint-100 text-mint-800'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-mint-600 text-white' : 'bg-red-100 text-red-700'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Institutional Compliance Disclaimer Banner */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
          <FileCheck2 className="w-3.5 h-3.5 text-mint-600" />
          <span>Decision Support</span>
        </div>
        <p>
          Risk scores represent prototype indicators, not proof of financial crime. Final adjudication requires compliance analyst sign-off.
        </p>
      </div>
    </aside>
  );
};
