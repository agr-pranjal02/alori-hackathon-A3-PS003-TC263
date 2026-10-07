import React, { useState } from 'react';
import { FederatedRoundResult, CentralizedBaselineResult } from '../types/fl';
import { MultiLineChart } from './Charts';
import { Play, ShieldAlert, Cpu, Sparkles, TrendingDown, ArrowRight } from 'lucide-react';

interface PerformanceViewProps {
  history: FederatedRoundResult[];
  centralizedResult: CentralizedBaselineResult;
  isTraining: boolean;
  onRunBatchTraining: (rounds: number) => void;
  onRunSingleStep: () => void;
  onReset: () => void;
  activeClientCount: number;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  history,
  centralizedResult,
  isTraining,
  onRunBatchTraining,
  onRunSingleStep,
  onReset,
  activeClientCount,
}) => {
  const [interactiveRounds, setInteractiveRounds] = useState<number>(5);
  const latestRound = history[history.length - 1];

  // Current metrics
  const cMae = centralizedResult.metrics.mae;
  const cRmse = centralizedResult.metrics.rmse;
  const fMae = latestRound ? latestRound.globalMetrics.mae : null;
  const fRmse = latestRound ? latestRound.globalMetrics.rmse : null;
  const fR2 = latestRound ? latestRound.globalMetrics.r2 : null;
  const fMape = latestRound ? latestRound.globalMetrics.mape : null;

  // Real-time MAE series data
  const maeSeries = [
    {
      id: 'fl_mae',
      label: 'Federated Global MAE',
      color: '#10b981', // emerald
      data: history.map(r => ({ x: `R${r.round}`, y: r.globalMetrics.mae })),
      strokeWidth: 2.5,
    },
  ];

  // Real-time RMSE series data
  const rmseSeries = [
    {
      id: 'fl_rmse',
      label: 'Federated Global RMSE',
      color: '#3b82f6', // blue
      data: history.map(r => ({ x: `R${r.round}`, y: r.globalMetrics.rmse })),
      strokeWidth: 2.5,
    },
  ];

  // Head-to-Head comparison table rows
  const comparisonRows = [
    {
      metric: 'Data-Sharing Approach',
      centralized: 'All raw sensor records streamed to central server',
      federated: 'Raw data stays strictly at edge; parameter updates only',
      advantage: 'Federated (Zero Raw Data Shared)',
    },
    {
      metric: 'Mean Absolute Error (MAE)',
      centralized: `${cMae.toFixed(3)} veh/h`,
      federated: fMae ? `${fMae.toFixed(3)} veh/h` : 'Pending Training',
      advantage: fMae && fMae <= cMae * 1.05 ? 'Comparable to Centralized' : 'Convergence in Progress',
    },
    {
      metric: 'Root Mean Squared Error (RMSE)',
      centralized: `${cRmse.toFixed(3)} veh/h`,
      federated: fRmse ? `${fRmse.toFixed(3)} veh/h` : 'Pending Training',
      advantage: fRmse && fRmse <= cRmse * 1.08 ? 'Comparable to Centralized' : 'Convergence in Progress',
    },
    {
      metric: 'Training Rounds',
      centralized: '1 (Single-step batch pooling)',
      federated: `${history.length} Synchronizations`,
      advantage: 'Centralized has fewer rounds, but zero privacy',
    },
    {
      metric: 'Network Communication Cost',
      centralized: `${(centralizedResult.rawDatasetSizeBytes / 1024).toFixed(1)} KB (One-time raw CSV)`,
      federated: latestRound ? `${latestRound.cumulativeKb.toFixed(1)} KB (Iterative weight deltas)` : '0.0 KB',
      advantage: 'Measurable Network Overhead',
    },
    {
      metric: 'Data Privacy Architecture',
      centralized: 'Zero privacy (Central repository stores all logs)',
      federated: 'Edge-isolated data partitions (Decentralized FedAvg)',
      advantage: 'Federated (Municipal Sovereignty)',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 mb-1">
              <span>REAL-TIME MODEL PERFORMANCE EVALUATION</span>
              <span aria-hidden="true">·</span>
              <span>LIVE CONVERGENCE TRACKING</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Model Performance & Benchmark Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track and visualize key metrics (MAE and RMSE) for both the global federated model and baseline centralized model in real-time.
            </p>
          </div>

          {/* Interactive In-Tab Training Trigger */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-slate-600 px-1">Rounds:</span>
              <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-lg">
                {[1, 5, 10].map(r => (
                  <button
                    key={r}
                    onClick={() => setInteractiveRounds(r)}
                    disabled={isTraining}
                    className={`px-2.5 py-1 text-xs font-mono rounded font-medium transition-all ${
                      interactiveRounds === r
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onRunBatchTraining(interactiveRounds)}
              disabled={isTraining}
              className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs ${
                isTraining
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training Live...' : '▶ Run & Watch Live'}</span>
            </button>

            <button
              onClick={onRunSingleStep}
              disabled={isTraining}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              +1 Step
            </button>
          </div>
        </div>

        {/* Live Metrics Real-Time Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5">
          {/* FL Global MAE */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between text-emerald-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Global FL MAE</span>
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-950">
              {fMae ? fMae.toFixed(3) : '--'}
            </div>
            <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-mono">
              {fMae ? (
                <>
                  <span>Δ Baseline:</span>
                  <span className={fMae <= cMae ? 'font-bold text-emerald-800' : 'text-amber-800'}>
                    {(fMae - cMae > 0 ? `+` : '') + (fMae - cMae).toFixed(3)}
                  </span>
                </>
              ) : (
                'Start training above'
              )}
            </div>
          </div>

          {/* FL Global RMSE */}
          <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl">
            <div className="flex items-center justify-between text-blue-800 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Global FL RMSE</span>
              <TrendingDown className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-950">
              {fRmse ? fRmse.toFixed(3) : '--'}
            </div>
            <div className="text-xs text-blue-700 mt-1 flex items-center gap-1 font-mono">
              {fRmse ? (
                <>
                  <span>Δ Baseline:</span>
                  <span className={fRmse <= cRmse ? 'font-bold text-blue-800' : 'text-amber-800'}>
                    {(fRmse - cRmse > 0 ? `+` : '') + (fRmse - cRmse).toFixed(3)}
                  </span>
                </>
              ) : (
                'Start training above'
              )}
            </div>
          </div>

          {/* Centralized Baseline MAE */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Baseline MAE</span>
              <Cpu className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {cMae.toFixed(3)}
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              RMSE: {cRmse.toFixed(3)} veh/h
            </div>
          </div>

          {/* Round & Clients Status */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Training State</span>
              <Sparkles className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {history.length} <span className="text-xs font-normal text-slate-500">Rounds</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {activeClientCount} Clients Synchronized
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Live Visualizations: MAE and RMSE Convergence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dynamic Chart 1: MAE Convergence */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Mean Absolute Error (MAE) Convergence
              </h3>
              <p className="text-xs text-slate-500">
                Dynamically tracking global model MAE vs Centralized Baseline across federated rounds.
              </p>
            </div>
          </div>

          <MultiLineChart
            series={maeSeries}
            referenceLine={{
              y: cMae,
              label: 'Centralized Baseline MAE',
              color: '#ef4444', // red reference line
              dashed: true,
            }}
            height={260}
            yLabel="MAE (Vehicles / Hour)"
            xLabel="Federated Round"
          />
        </div>

        {/* Dynamic Chart 2: RMSE Convergence */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Root Mean Squared Error (RMSE) Convergence
              </h3>
              <p className="text-xs text-slate-500">
                Dynamically tracking global model RMSE vs Centralized Baseline across federated rounds.
              </p>
            </div>
          </div>

          <MultiLineChart
            series={rmseSeries}
            referenceLine={{
              y: cRmse,
              label: 'Centralized Baseline RMSE',
              color: '#dc2626', // red reference line
              dashed: true,
            }}
            height={260}
            yLabel="RMSE (Vehicles / Hour)"
            xLabel="Federated Round"
          />
        </div>
      </div>

      {/* Head-to-Head Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Head-to-Head Architectural Comparison
            </h2>
            <p className="text-xs text-slate-500">
              Direct comparison between Centralized Machine Learning and SmartFlow Federated Learning.
            </p>
          </div>
          <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
            PS-003 Benchmark Matrix
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                <th className="pb-3 font-semibold">Evaluation Metric</th>
                <th className="pb-3 font-semibold text-blue-700">Centralized ML Baseline</th>
                <th className="pb-3 font-semibold text-emerald-700">Federated ML (SmartFlow FL)</th>
                <th className="pb-3 font-semibold text-slate-700">Architectural Trade-Off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-medium text-slate-900 font-sans">
                    {row.metric}
                  </td>
                  <td className="py-3 font-mono text-slate-700">
                    {row.centralized}
                  </td>
                  <td className="py-3 font-mono font-medium text-emerald-800">
                    {row.federated}
                  </td>
                  <td className="py-3 text-slate-600">
                    <span className="inline-flex items-center gap-1 font-medium text-[11px] text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded">
                      {row.advantage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy Architecture & Security Explanation */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Privacy Paradigm: Centralized vs Federated Architectures
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Centralized Box */}
          <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-200/80">
            <div className="font-bold text-rose-900 mb-1 flex items-center gap-1.5">
              <span>⚠️ Centralized Approach (Traditional)</span>
            </div>
            <p className="text-rose-800/90 leading-relaxed">
              Every junction transmits granular vehicle timestamps, precise vehicle counts, speed sensors, and lane occupancies directly to a cloud database.
            </p>
            <div className="mt-2 text-rose-700 font-mono text-[11px]">
              Raw Traffic Data ➔ Central Server (Privacy Vulnerable)
            </div>
          </div>

          {/* Federated Box */}
          <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
            <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <span>🛡️ Federated Approach (SmartFlow FL)</span>
            </div>
            <p className="text-emerald-800/90 leading-relaxed">
              Raw traffic data remains strictly on the junction's local edge compute device. Only localized regression weight vectors and bias deltas are shared.
            </p>
            <div className="mt-2 text-emerald-700 font-mono text-[11px]">
              Raw Data Stays Local ➔ Model Updates ➔ FedAvg Server
            </div>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Architecture Notice:</strong> This platform demonstrates the decentralized federated architecture and measures exact network communication costs.
            In production zero-trust municipal rollouts, additional layers such as Differential Privacy (DP) and Secure Multi-Party Computation (SMPC) are recommended to guard against theoretical gradient inversion attacks.
          </p>
        </div>
      </div>
    </div>
  );
};
