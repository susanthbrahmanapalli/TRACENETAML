import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Filter,
  Search,
  Sparkles,
  ShieldAlert,
  IndianRupee,
  Activity,
  ArrowRight,
  Maximize2,
  AlertTriangle,
  X,
  Play
} from 'lucide-react';
import { GraphNetworkResponse, GraphNode, GraphEdge, CyclePath } from '../types';
import { api } from '../api/client';
import { formatINR, formatCompactINR, formatDateTime, getPriorityBadge } from '../utils/formatters';

interface GraphViewProps {
  initialAccountId?: string | null;
  onOpenCase: (accountId: string) => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ initialAccountId, onOpenCase }) => {
  const [networkData, setNetworkData] = useState<GraphNetworkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightCycles, setHighlightCycles] = useState(false);
  
  // Controls
  const [focalAccount, setFocalAccount] = useState<string>(initialAccountId || '');
  const [hopDepth, setHopDepth] = useState<number>(2);
  const [maxNodes, setMaxNodes] = useState<number>(45);
  const [minAmountFilter, setMinAmountFilter] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Canvas Viewport transform
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Real-time stream indicator
  const [streamingNotice, setStreamingNotice] = useState<string | null>(null);

  const fetchGraph = async (accId?: string) => {
    setLoading(true);
    try {
      const data = await api.getGraphNetwork({
        focal_account_id: accId || focalAccount || undefined,
        depth: hopDepth,
        max_nodes: maxNodes
      });
      setNetworkData(data);
      if (accId) {
        const found = data.nodes.find((n) => n.id === accId);
        if (found) setSelectedNode(found);
      }
    } catch (err) {
      console.error('Failed to load graph data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph(initialAccountId || undefined);
  }, [hopDepth, maxNodes]);

  // Compute 2D node layout coordinates (Concentric circle layout)
  const nodePositions = React.useMemo(() => {
    if (!networkData?.nodes || networkData.nodes.length === 0) return new Map<string, { x: number; y: number }>();
    const pos = new Map<string, { x: number; y: number }>();
    const nodes = networkData.nodes;
    const centerNode = nodes.find((n) => n.is_focal) || nodes[0];
    const width = 800;
    const height = 550;
    const cx = width / 2;
    const cy = height / 2;

    pos.set(centerNode.id, { x: cx, y: cy });
    const remaining = nodes.filter((n) => n.id !== centerNode.id);

    // Group into 2 concentric rings
    const ring1 = remaining.slice(0, Math.min(12, remaining.length));
    const ring2 = remaining.slice(12);

    const r1 = 180;
    ring1.forEach((n, idx) => {
      const angle = (idx / ring1.length) * 2 * Math.PI;
      pos.set(n.id, {
        x: cx + r1 * Math.cos(angle),
        y: cy + r1 * Math.sin(angle)
      });
    });

    const r2 = 310;
    ring2.forEach((n, idx) => {
      const angle = (idx / ring2.length) * 2 * Math.PI;
      pos.set(n.id, {
        x: cx + r2 * Math.cos(angle),
        y: cy + r2 * Math.sin(angle)
      });
    });

    return pos;
  }, [networkData]);

  // Filter edges based on minAmountFilter
  const visibleEdges = React.useMemo(() => {
    if (!networkData?.edges) return [];
    return networkData.edges.filter((e) => e.amount >= minAmountFilter);
  }, [networkData, minAmountFilter]);

  // Pan and Zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetViewport = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFocusAccount = (accId: string) => {
    setFocalAccount(accId);
    fetchGraph(accId);
  };

  const handleSimulateLiveEvent = async () => {
    try {
      const res = await api.streamStep();
      setStreamingNotice(`Live ${res.channel} transfer injected: ${res.sender} → ${res.receiver} (${formatINR(res.amount)})`);
      setTimeout(() => setStreamingNotice(null), 4500);
      fetchGraph();
    } catch (err) {
      console.error('Failed to simulate stream event', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Live Graph Intelligence</h1>
            <span className="px-2 py-0.5 rounded-full bg-mint-100 text-mint-800 text-[10px] font-bold border border-mint-200 uppercase">
              Topological Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive transaction network graph with cycle detection, smurfing hub visualization, and INR ranges.
          </p>
        </div>

        {/* Live Stream Simulator Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateLiveEvent}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-mint-50 hover:bg-mint-100 text-mint-900 border border-mint-300 shadow-sm transition-all active:scale-95"
          >
            <Activity className="w-4 h-4 text-mint-600 animate-pulse" />
            <span>Simulate Real-Time Transfer</span>
          </button>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search & Account Focus */}
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search account (e.g. ACC-IND-0021)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mint-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          {searchQuery && (
            <button
              onClick={() => handleFocusAccount(searchQuery.trim())}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-mint-500 text-white hover:bg-mint-600"
            >
              Focus
            </button>
          )}
        </div>

        {/* Indian Amount Range Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
            <IndianRupee className="w-3 h-3 text-mint-600" />
            <span>Range:</span>
          </span>
          <select
            value={minAmountFilter}
            onChange={(e) => setMinAmountFilter(Number(e.target.value))}
            className="px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-mint-500"
          >
            <option value={0}>All Transactions</option>
            <option value={50000}>₹50,000+ (50k)</option>
            <option value={100000}>₹1,00,000+ (1 Lakh)</option>
            <option value={250000}>₹2,50,000+ (2.5 Lakhs)</option>
            <option value={500000}>₹5,00,000+ (5 Lakhs)</option>
          </select>
        </div>

        {/* Hop Depth & Node Limit */}
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <div className="flex items-center space-x-1">
            <span className="font-medium">Hops:</span>
            <select
              value={hopDepth}
              onChange={(e) => setHopDepth(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value={1}>1-Hop</option>
              <option value={2}>2-Hops</option>
              <option value={3}>3-Hops</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="font-medium">Max Nodes:</span>
            <select
              value={maxNodes}
              onChange={(e) => setMaxNodes(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value={25}>25</option>
              <option value={45}>45</option>
              <option value={80}>80</option>
            </select>
          </div>
        </div>

        {/* Cycle Highlighting Toggle */}
        <button
          onClick={() => setHighlightCycles(!highlightCycles)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border flex items-center space-x-1.5 transition-all ${
            highlightCycles
              ? 'bg-red-500 text-white border-red-600 shadow-sm shadow-red-500/25'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>
            {highlightCycles
              ? 'Highlighting Active Cycles'
              : `Highlight Cycles (${networkData?.detected_cycles?.length || 0})`}
          </span>
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 border-l pl-3 border-slate-200">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2.4))}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetViewport}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Real-time Streaming Toast */}
      {streamingNotice && (
        <div className="p-3 bg-mint-500 text-white text-xs font-semibold rounded-xl shadow-lg flex items-center justify-between animate-fade-in shrink-0">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 animate-spin" />
            <span>{streamingNotice}</span>
          </div>
          <button onClick={() => setStreamingNotice(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Canvas + Detail Drawer Container */}
      <div className="relative flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex">
        {/* SVG Interactive Canvas */}
        <div
          className="flex-1 h-full cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-20">
              <div className="flex flex-col items-center space-y-2">
                <Network className="w-8 h-8 text-mint-500 animate-spin" />
                <span className="text-xs font-semibold text-slate-600">Rendering topological graph...</span>
              </div>
            </div>
          ) : null}

          {/* Canvas Viewport */}
          <svg
            className="w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              <defs>
                {/* Arrowhead marker */}
                <marker
                  id="arrow-mint"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
                </marker>
                <marker
                  id="arrow-cycle"
                  viewBox="0 0 10 10"
                  refX="26"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#DC2626" />
                </marker>
                <marker
                  id="arrow-default"
                  viewBox="0 0 10 10"
                  refX="24"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
                </marker>
              </defs>

              {/* Graph Edges */}
              {visibleEdges.map((edge) => {
                const sPos = nodePositions.get(edge.source);
                const tPos = nodePositions.get(edge.target);
                if (!sPos || !tPos) return null;

                const isCycle = highlightCycles && edge.is_part_of_cycle;
                const strokeColor = isCycle ? '#DC2626' : edge.amount >= 200000 ? '#10B981' : '#CBD5E1';
                const strokeWidth = isCycle ? 3 : edge.amount >= 200000 ? 2.5 : 1.5;
                const marker = isCycle ? 'url(#arrow-cycle)' : edge.amount >= 200000 ? 'url(#arrow-mint)' : 'url(#arrow-default)';

                const midX = (sPos.x + tPos.x) / 2;
                const midY = (sPos.y + tPos.y) / 2;

                return (
                  <g key={edge.id} className="transition-all">
                    <line
                      x1={sPos.x}
                      y1={sPos.y}
                      x2={tPos.x}
                      y2={tPos.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isCycle ? '6,4' : undefined}
                      markerEnd={marker}
                    />
                    {/* Amount Label on edge */}
                    <text
                      x={midX}
                      y={midY - 4}
                      fill={isCycle ? '#DC2626' : '#475569'}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                      className="font-mono bg-white px-1 select-none pointer-events-none"
                    >
                      {formatCompactINR(edge.amount)}
                    </text>
                  </g>
                );
              })}

              {/* Graph Nodes (Accounts) */}
              {networkData?.nodes.map((node) => {
                const pos = nodePositions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNode?.id === node.id;
                const isHighRisk = node.risk_score >= 70 || node.is_flagged;
                const borderColor = isHighRisk ? '#DC2626' : node.risk_score >= 50 ? '#EA580C' : '#10B981';
                const nodeSize = node.is_focal ? 26 : Math.min(22, Math.max(16, 12 + node.degree * 2));

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Selection halo */}
                    {isSelected && (
                      <circle
                        r={nodeSize + 8}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeDasharray="4,3"
                        className="animate-spin-slow"
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      r={nodeSize}
                      fill="#FFFFFF"
                      stroke={borderColor}
                      strokeWidth={isHighRisk ? 3 : 2}
                      className="shadow-md transition-transform group-hover:scale-110"
                    />

                    {/* Node Initials or Icon */}
                    <text
                      textAnchor="middle"
                      dy="4"
                      fontSize="10"
                      fontWeight="bold"
                      fill={isHighRisk ? '#DC2626' : '#0F172A'}
                      className="select-none pointer-events-none"
                    >
                      {node.label.charAt(0)}
                    </text>

                    {/* Account Label underneath */}
                    <text
                      textAnchor="middle"
                      dy={nodeSize + 14}
                      fontSize="10"
                      fontWeight="600"
                      fill="#1E293B"
                      className="select-none pointer-events-none"
                    >
                      {node.label.length > 14 ? node.label.substring(0, 14) + '...' : node.label}
                    </text>

                    {/* Account ID */}
                    <text
                      textAnchor="middle"
                      dy={nodeSize + 24}
                      fontSize="8"
                      fill="#64748B"
                      className="font-mono select-none pointer-events-none"
                    >
                      {node.id}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Quick Stats Overlay */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 space-x-3 shadow-sm">
            <span>Nodes: <strong className="text-slate-900">{networkData?.total_nodes || 0}</strong></span>
            <span>Transfers: <strong className="text-slate-900">{visibleEdges.length}</strong></span>
            <span>Cycles: <strong className="text-red-600 font-bold">{networkData?.detected_cycles?.length || 0}</strong></span>
          </div>
        </div>

        {/* Slide-in Account Intelligence Dossier */}
        {selectedNode && (
          <div className="w-80 border-l border-slate-200 bg-white p-5 overflow-y-auto space-y-5 shadow-xl shrink-0">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-mint-100 flex items-center justify-center font-bold text-mint-700 text-xs">
                  {selectedNode.label.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedNode.label}</h3>
                  <div className="text-[11px] font-mono text-slate-400">{selectedNode.id}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Risk Badge */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Calculated Risk Score</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  selectedNode.risk_score >= 70
                    ? 'bg-red-100 text-red-800'
                    : selectedNode.risk_score >= 40
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-mint-100 text-mint-800'
                }`}>
                  {selectedNode.risk_score.toFixed(1)} / 100
                </span>
              </div>
              <div className="text-[11px] text-slate-500">Account Type: {selectedNode.account_type}</div>
            </div>

            {/* Indian Banking Financial Stats */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Financial Aggregates (INR)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-mint-50/60 border border-mint-200">
                  <div className="text-[10px] text-mint-700 uppercase font-semibold">Total Inflow</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{formatCompactINR(selectedNode.total_inflow)}</div>
                  <div className="text-[10px] text-slate-500">{formatINR(selectedNode.total_inflow)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Outflow</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{formatCompactINR(selectedNode.total_outflow)}</div>
                  <div className="text-[10px] text-slate-500">{formatINR(selectedNode.total_outflow)}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Connected Network Counterparties: <strong className="text-slate-800 font-mono">{selectedNode.degree}</strong>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleFocusAccount(selectedNode.id)}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-mint-500 hover:bg-mint-600 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Focus Ego Subgraph</span>
              </button>

              <button
                onClick={() => onOpenCase(selectedNode.id)}
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center justify-center space-x-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-mint-400" />
                <span>Open Investigation Case</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
