import React from 'react';
import { FederatedRoundResult, CentralizedBaselineResult } from '../types/fl';
import { MultiLineChart, DualBarChart } from './Charts';
import { Database, ArrowUpRight, ArrowDownRight, HardDrive, Info } from 'lucide-react';

interface CommunicationViewProps {
  history: FederatedRoundResult[];
  centralizedResult: CentralizedBaselineResult;
  onNavigateToFl: () => void;
}

export const CommunicationView: React.FC<CommunicationViewProps> = ({
  history,
  centralizedResult,
  onNavigateToFl,
}) => {
  const latestRound = history[history.length - 1];
  const totalRounds = history.length;

  const totalUploadKb = history.reduce((sum, r) => sum + r.roundUploadKb, 0);
  const totalDownloadKb = history.reduce((sum, r) => sum + r.roundDownloadKb, 0);
  const totalFlCostKb = latestRound ? latestRound.cumulativeKb : 0;
  const rawDataKb = Math.round((centralizedResult.rawDatasetSizeBytes / 1024) * 10) / 10;

  // Chart data for Communication vs Rounds
  const commTrendSeries = [
    {
      id: 'roundTotal',
      label: 'Per-Round Cost (KB)',
      color: '#6366f1', // indigo
      data: history.map(r => ({ x: `R${r.round}`, y: r.roundTotalKb })),
      strokeWidth: 2,
    },
    {
      id: 'cumulative',
      label: 'Cumulative Bandwidth (KB)',
      color: '#f59e0b', // amber
      data: history.map(r => ({ x: `R${r.round}`, y: r.cumulativeKb })),
      strokeWidth: 2.5,
    },
  ];

  // Bar chart breakdown
  const barChartItems = history.map(r => ({
    label: `R${r.round}`,
    value: r.roundUploadKb,
    secondaryValue: r.roundDownloadKb,
  }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-600 mb-1">
              <span>PS-003 CORE EVALUATION METRIC</span>
              <span aria-hidden="true">·</span>
              <span>NETWORK BANDWIDTH AUDIT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Communication Cost Evaluation
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Empirical accounting of uplink, downlink, and cumulative network payload sizes across federated synchronizations.
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Upload */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total Upload</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalUploadKb.toFixed(1)} <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Edge Clients → Central Server
          </div>
        </div>

        {/* Download */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total Download</span>
            <ArrowDownRight className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalDownloadKb.toFixed(1)} <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Global Model Broadcasts
          </div>
        </div>

        {/* Total FL Comm */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Cumulative FL Comm</span>
            <Database className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalFlCostKb.toFixed(1)} <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {totalRounds} Synchronizations
          </div>
        </div>

        {/* Centralized Baseline Raw Size */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Centralized Raw CSV</span>
            <HardDrive className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {rawDataKb.toFixed(1)} <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            One-time Raw Data Transfer
          </div>
        </div>
      </div>

      {/* Critical Scientific Note (PS-003 Guideline Compliance) */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-950">
            PS-003 Objective: Experimental Measurement vs Presumed Advantage
          </div>
          <p className="leading-relaxed">
            Federated learning does <strong>not</strong> necessarily have lower communication cost than transmitting raw data once.
            While each round’s model delta is compact (~1.22 KB per client), iterative federated rounds accumulate communication overhead.
            SmartFlow FL’s purpose is to <strong>quantify and audit</strong> this overhead experimentally so municipal network engineers
            can evaluate the trade-off between strict data privacy and network bandwidth consumption.
          </p>
        </div>
      </div>

      {totalRounds === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-2xs">
          <p className="text-slate-500 text-xs">
            No communication telemetry recorded yet. Run at least 1 federated round to populate network cost evaluation.
          </p>
          <button
            onClick={onNavigateToFl}
            className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors inline-block"
          >
            Launch Federated Training
          </button>
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Comm vs Rounds */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Communication Cost vs Federated Rounds
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tracking per-round network cost alongside cumulative bandwidth consumption.
                  </p>
                </div>
              </div>
              <MultiLineChart
                series={commTrendSeries}
                referenceLine={{
                  y: rawDataKb,
                  label: 'Raw Dataset Size',
                  color: '#ef4444',
                  dashed: true,
                }}
                height={260}
                yLabel="Payload (KB)"
                xLabel="Round Index"
              />
            </div>

            {/* Chart 2: Upload vs Download per Round */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Upload vs Download Breakdown per Round
                  </h3>
                  <p className="text-xs text-slate-500">
                    Client delta uploads vs central server global model broadcast payloads.
                  </p>
                </div>
              </div>
              <DualBarChart
                items={barChartItems}
                primaryLabel="Uplink (KB)"
                secondaryLabel="Downlink (KB)"
                primaryColor="#6366f1"
                secondaryColor="#a855f7"
                height={240}
                unit="KB"
              />
            </div>
          </div>

          {/* Detailed Communication Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Round-by-Round Network Audit Table
                </h3>
                <p className="text-xs text-slate-500">
                  Full ledger of payload sizes per client, per round, and cumulative trajectory.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400">
                    <th className="pb-2.5 font-medium">Round</th>
                    <th className="pb-2.5 font-medium">Clients</th>
                    <th className="pb-2.5 font-medium">Upload / Client</th>
                    <th className="pb-2.5 font-medium">Total Upload</th>
                    <th className="pb-2.5 font-medium">Download / Client</th>
                    <th className="pb-2.5 font-medium">Total Download</th>
                    <th className="pb-2.5 font-medium">Round Total</th>
                    <th className="pb-2.5 font-medium">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {history.map(r => {
                    const upPerClient = Math.round((r.roundUploadKb / r.clientsCount) * 100) / 100;
                    const downPerClient = Math.round((r.roundDownloadKb / r.clientsCount) * 100) / 100;

                    return (
                      <tr key={r.round} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-semibold text-slate-900">
                          Round #{r.round}
                        </td>
                        <td className="py-2.5 text-slate-600 font-sans">
                          {r.clientsCount}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {upPerClient.toFixed(2)} KB
                        </td>
                        <td className="py-2.5 text-indigo-600 font-medium">
                          {r.roundUploadKb.toFixed(2)} KB
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {downPerClient.toFixed(2)} KB
                        </td>
                        <td className="py-2.5 text-purple-600 font-medium">
                          {r.roundDownloadKb.toFixed(2)} KB
                        </td>
                        <td className="py-2.5 text-slate-900 font-bold">
                          {r.roundTotalKb.toFixed(2)} KB
                        </td>
                        <td className="py-2.5 text-amber-700 font-bold">
                          {r.cumulativeKb.toFixed(2)} KB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mathematical Payload Derivation Breakdown */}
          <div className="bg-slate-900 text-slate-200 rounded-xl p-5 shadow-2xs font-mono text-xs">
            <h4 className="font-bold text-white mb-2 text-sm">
              Mathematical Derivation of Model Payload Size
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed text-slate-300">
              <div className="space-y-1">
                <div className="text-emerald-400 font-semibold">1. Linear Parameter Dimensions</div>
                <div>• Weight vector: 5 features × 8 bytes (float64) = 40 bytes</div>
                <div>• Bias intercept: 1 float64 = 8 bytes</div>
                <div>• Feature scaler means: 5 float64 = 40 bytes</div>
                <div>• Feature scaler standard deviations: 5 float64 = 40 bytes</div>
                <div>• Raw parameter memory footprint = 128 bytes</div>
              </div>
              <div className="space-y-1">
                <div className="text-indigo-400 font-semibold">2. Serialization & Transport Framing</div>
                <div>• Client metadata & authentication signature: 128 bytes</div>
                <div>• JSON / Protobuf framing and key encodings: ~992 bytes</div>
                <div>• Total deterministic payload size = 1,248 bytes (~1.22 KB)</div>
                <div>• Formula: Round Total = Clients × (Upload_Payload + Download_Payload)</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
