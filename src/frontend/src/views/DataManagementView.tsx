import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  Info,
  Layers
} from 'lucide-react';
import { api } from '../api/client';

interface DataManagementViewProps {
  onRefreshAll: () => void;
}

export const DataManagementView: React.FC<DataManagementViewProps> = ({ onRefreshAll }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);
  const [reseeding, setReseeding] = useState(false);
  const [reseedNotice, setReseedNotice] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setImportReport(null);
    try {
      const rep = await api.importCSV(file);
      setImportReport(rep);
      onRefreshAll();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReseed = async () => {
    setReseeding(true);
    setReseedNotice(null);
    try {
      const res = await api.reseedDemo();
      setReseedNotice(`Generated ${res.transactions_created} transactions across ${res.accounts_created} accounts. ${res.alerts_generated} alerts flagged.`);
      onRefreshAll();
    } catch (err: any) {
      alert(`Reseed failed: ${err.message}`);
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
          <span>Data Ingestion & Demo Generator</span>
          <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-800 text-xs font-semibold border border-mint-200">
            ETL PIPELINE
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Batch ingest CSV files with automatic field normalization, or regenerate reproducible synthetic Indian banking benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV File Upload Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-mint-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Batch CSV Ingestion
            </h2>
          </div>

          <div className="border-2 border-dashed border-slate-200 hover:border-mint-400 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-50/50">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <label htmlFor="csv-upload" className="cursor-pointer font-semibold text-xs text-mint-600 hover:text-mint-700">
                Click to browse CSV file
              </label>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">Accepts canonical or mapped CSV headers</p>
            </div>
            {file && (
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-700 font-semibold inline-block">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-mint-500 hover:bg-mint-600 text-white transition-colors disabled:opacity-50 shadow-sm"
          >
            {uploading ? 'Validating & Ingesting Rows...' : 'Upload & Process Transactions'}
          </button>

          {/* Import Summary Report */}
          {importReport && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-mint-600" />
                <span>Ingestion Validation Report</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 bg-white rounded-lg border border-mint-200">
                  <div className="text-[10px] text-slate-400">Accepted</div>
                  <div className="text-sm font-bold text-mint-600">{importReport.accepted}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-amber-200">
                  <div className="text-[10px] text-slate-400">Duplicates</div>
                  <div className="text-sm font-bold text-amber-600">{importReport.duplicates}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-red-200">
                  <div className="text-[10px] text-slate-400">Rejected</div>
                  <div className="text-sm font-bold text-red-600">{importReport.rejected}</div>
                </div>
              </div>

              {importReport.rejection_details?.length > 0 && (
                <div className="p-2 bg-red-50 text-red-800 rounded-lg text-[11px] font-mono max-h-32 overflow-y-auto space-y-1">
                  <div className="font-bold">Rejection Details:</div>
                  {importReport.rejection_details.map((rej: any, i: number) => (
                    <div key={i}>Row {rej.row}: {rej.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reseed Deterministic Demo Dataset Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-mint-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Deterministic Demo Generator
            </h2>
          </div>

          <p className="text-xs text-slate-600">
            Reseed the database with deterministic Indian banking scenarios (Seed: 42) including UPI/IMPS transactions, normal salary dispatches, smurfing rings, circular layering, and velocity bursts.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="font-semibold text-slate-800">Included Demo Scenarios:</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
              <li>High-velocity rapid burst transfers (UPI micro-transfers)</li>
              <li>Sudden baseline amount spike (3.0x deviation)</li>
              <li>Rapid onward pass-through layering (&gt;85% funds moved in &lt;15 mins)</li>
              <li>Counterparty diversity explosion (7 novel accounts)</li>
              <li>Fan-in smurfing aggregation to mule collector</li>
              <li>Directed circular transfer loop (A → B → C → A)</li>
              <li>Dormant sleeper account sudden awakening</li>
            </ul>
          </div>

          <button
            onClick={handleReseed}
            disabled={reseeding}
            className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-mint-400 ${reseeding ? 'animate-spin' : ''}`} />
            <span>{reseeding ? 'Generating Synthetic Ledger...' : 'Reseed Demo Dataset'}</span>
          </button>

          {reseedNotice && (
            <div className="p-3 bg-mint-50 border border-mint-200 text-mint-900 rounded-xl text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-mint-600 shrink-0" />
              <span>{reseedNotice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
