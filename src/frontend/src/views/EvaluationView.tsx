import React, { useState, useEffect } from 'react';
import {
  Cpu,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { EvaluationResponse } from '../types';
import { api } from '../api/client';

export const EvaluationView: React.FC = () => {
  const [evalData, setEvalData] = useState<EvaluationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchEval = async () => {
    try {
      const data = await api.runEvaluation();
      setEvalData(data);
    } catch (err) {
      console.error('Failed to run evaluation', err);
    } finally {
      setLoading(false);
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchEval();
  }, []);

  const handleRunEvaluation = () => {
    setRunning(true);
    fetchEval();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Evaluation Lab</span>
            <span className="px-2.5 py-0.5 rounded-full bg-mint-100 text-mint-800 text-xs font-semibold border border-mint-200">
              BENCHMARK LAB
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Repeatable quantitative evaluation of detection performance against labelled ground-truth scenarios.
          </p>
        </div>

        <button
          onClick={handleRunEvaluation}
          disabled={running}
          className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-xl bg-mint-500 hover:bg-mint-600 text-white shadow-sm transition-all disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Benchmarking Engine...' : 'Run Quantitative Benchmark'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Computing benchmark metrics...</div>
      ) : evalData ? (
        <>
          {/* Dataset Info Header */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Benchmark Testbed:</span>
              <div className="font-bold text-slate-900">{evalData.dataset_name}</div>
            </div>
            <div className="flex items-center space-x-6 text-slate-600 font-mono">
              <div>Sample Size: <strong className="text-slate-900">{evalData.sample_size}</strong></div>
              <div>Ground Truth Positives: <strong className="text-red-600">{evalData.positive_class_count}</strong></div>
              <div>Ground Truth Benign: <strong className="text-mint-700">{evalData.negative_class_count}</strong></div>
            </div>
          </div>

          {/* Core Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Precision */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Precision</span>
              <div className="text-3xl font-black text-mint-600">
                {(evalData.precision * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">Accuracy of positive alert flags (TP / TP+FP)</p>
            </div>

            {/* Recall */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detection Recall</span>
              <div className="text-3xl font-black text-slate-900">
                {(evalData.recall * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">Coverage of ground truth fraud (TP / TP+FN)</p>
            </div>

            {/* F1 Score */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">F1-Score</span>
              <div className="text-3xl font-black text-mint-700">
                {(evalData.f1_score * 100).toFixed(1)}%
              </div>
              <p className="text-[11px] text-slate-400">Harmonic mean of precision and recall</p>
            </div>

            {/* Processing Latency */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine Latency</span>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {evalData.latency_ms_per_txn} <span className="text-sm font-normal text-slate-400">ms/tx</span>
              </div>
              <p className="text-[11px] text-slate-400">Average scoring & graph traversal time</p>
            </div>
          </div>

          {/* Confusion Matrix & Baseline Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Confusion Matrix */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2x2 Confusion Matrix
                </h3>
                <span className="text-[11px] text-slate-400">Threshold: Score ≥ 55.0</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* True Positives */}
                <div className="p-4 rounded-xl bg-mint-50/70 border border-mint-200 text-center">
                  <div className="text-[11px] font-bold text-mint-800 uppercase">True Positives (TP)</div>
                  <div className="text-3xl font-black text-mint-600 mt-1">{evalData.confusion_matrix.true_positives}</div>
                  <div className="text-[10px] text-mint-700 mt-1">Correctly Flagged Suspicious</div>
                </div>

                {/* False Positives */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-600 uppercase">False Positives (FP)</div>
                  <div className="text-3xl font-black text-slate-700 mt-1">{evalData.confusion_matrix.false_positives}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Benign Mistakenly Flagged</div>
                </div>

                {/* False Negatives */}
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">False Negatives (FN)</div>
                  <div className="text-3xl font-black text-amber-600 mt-1">{evalData.confusion_matrix.false_negatives}</div>
                  <div className="text-[10px] text-amber-700 mt-1">Pre-threshold Micro Transactions</div>
                </div>

                {/* True Negatives */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-[11px] font-bold text-slate-600 uppercase">True Negatives (TN)</div>
                  <div className="text-3xl font-black text-slate-700 mt-1">{evalData.confusion_matrix.true_negatives}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Correctly Cleared Normal Flow</div>
                </div>
              </div>
            </div>

            {/* Baseline Comparison Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-mint-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Baseline Comparison vs Naive Thresholding
                </h3>
              </div>

              <div className="p-4 rounded-xl bg-mint-50/40 border border-mint-200 space-y-2 text-xs">
                <div className="font-semibold text-slate-800">
                  Compared Model: <span className="font-mono text-mint-900">{evalData.baseline_comparison.baseline_model}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400">Baseline F1 Score:</span>
                    <div className="text-lg font-bold text-slate-800">
                      {(evalData.baseline_comparison.baseline_f1_score * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-mint-300">
                    <span className="text-[10px] text-mint-700 font-bold">TraceNet Improvement:</span>
                    <div className="text-lg font-bold text-mint-600">
                      +{evalData.baseline_comparison.tracenet_f1_improvement_pct}%
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 pt-1 italic">
                  "{evalData.baseline_comparison.explanation}"
                </p>
              </div>

              <div className="text-[11px] text-slate-500 flex items-start space-x-1.5 pt-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Evaluation executed deterministically without test leakage. Temporal features adhere strictly to prior transaction window boundaries.
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
