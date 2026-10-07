import React from 'react';
import { TrafficRecord, FederatedRoundResult, CentralizedBaselineResult, ActiveTab } from '../types/fl';
import { JUNCTIONS_METADATA } from '../services/trafficData';
import { MultiLineChart } from './Charts';
import { ArrowRight, ShieldCheck, Activity, Cpu, Database, Network } from 'lucide-react';

interface OverviewViewProps {
  records: TrafficRecord[];
  history: FederatedRoundResult[];
  centralizedResult: CentralizedBaselineResult;
  activeClientIds: string[];
  isTraining: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onStartTraining: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  records,
  history,
  centralizedResult,
  activeClientIds,
  isTraining,
  onNavigate,
  onStartTraining,
}) => {
  const latestRound = history[history.length - 1];
  const roundsCompleted = history.length;
  const totalCommKb = latestRound ? latestRound.cumulativeKb : 0;
  
  // Calculate average traffic flow
  const avgTraffic = Math.round(
    records.reduce((acc, r) => acc + r.vehicle_count, 0) / (records.length || 1)
  );

  // Sample data for the 48-hour traffic overview chart
  const sampleTimelineHours = 48;
  const sampleTimePoints = records.slice(0, sampleTimelineHours * 4);
  
  const chartSeries = JUNCTIONS_METADATA.filter(j => activeClientIds.includes(j.id)).map(j => {
    const jRecords = sampleTimePoints.filter(r => r.junction_id === j.id).slice(0, sampleTimelineHours);
    return {
      id: j.id,
      label: j.name,
      color: j.color,
      data: jRecords.map((r, idx) => ({
        x: `${r.hour}:00`,
        y: r.vehicle_count,
      })),
    };
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 mb-1">
              <span>HACKATHON PROBLEM PS-003</span>
              <span aria-hidden="true">·</span>
              <span>FEDERATED TRAFFIC-FLOW PREDICTION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              SmartFlow FL Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 max-w-3xl">
              Collaboratively train high-accuracy traffic prediction models across municipal intersections
              without pooling sensitive raw sensor telemetry, featuring real-time bandwidth audit.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('federated')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Federated Training Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Junctions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Junctions</span>
            <Network className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {activeClientIds.length} <span className="text-xs font-normal text-slate-400">/ 4</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            Edge Clients Active
          </div>
        </div>

        {/* Card 2: Federated Rounds */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">FL Rounds</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {roundsCompleted}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            FedAvg Synchronizations
          </div>
        </div>

        {/* Card 3: Traffic Flow */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Avg Traffic</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {avgTraffic}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Vehicles / Hour
          </div>
        </div>

        {/* Card 4: Model Error */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Global MAE</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {latestRound ? latestRound.globalMetrics.mae.toFixed(2) : '--'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Baseline: {centralizedResult.metrics.mae.toFixed(2)}
          </div>
        </div>

        {/* Card 5: Comm Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Comm Cost</span>
            <Database className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {totalCommKb.toFixed(1)} <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            Network Payload
          </div>
        </div>

        {/* Card 6: Training Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm font-semibold mt-1">
            {isTraining ? (
              <span className="text-indigo-600 animate-pulse flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Training Round...
              </span>
            ) : roundsCompleted > 0 ? (
              <span className="text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Model
              </span>
            ) : (
              <span className="text-slate-600">Ready</span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Privacy: Guaranteed
          </div>
        </div>
      </div>

      {/* Network Architecture Diagram */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Federated Edge Architecture</h2>
            <p className="text-xs text-slate-500">
              Each simulated junction retains raw telemetry locally; only mathematical parameter weights are transmitted.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            FedAvg (McMahan et al.)
          </span>
        </div>

        {/* Responsive Interactive Architecture Blueprint */}
        <div className="bg-slate-950 rounded-lg p-5 text-slate-200 font-mono text-xs overflow-x-auto">
          <div className="text-center font-bold text-emerald-400 mb-1">
            [ CENTRAL FEDERATED SERVER ]
          </div>
          <div className="text-center text-slate-400 text-[11px] mb-3">
            Aggregates: W_global = ∑ (n_k / N) · W_k &nbsp;|&nbsp; Audits Bandwidth Overheads
          </div>

          <div className="text-center text-slate-500 mb-2">
            {"                    | (Global Model Broadcast: ~1.2 KB / client)                     "}
          </div>
          <div className="text-center text-indigo-400 mb-2">
            {"┌────────────────────┬────────────────────┬────────────────────┐"}
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[11px] min-w-[620px]">
            {JUNCTIONS_METADATA.map((j) => {
              const isActive = activeClientIds.includes(j.id);
              return (
                <div
                  key={j.id}
                  className={`p-3 rounded border text-left ${
                    isActive
                      ? 'bg-slate-900/90 border-indigo-500/50 text-slate-200'
                      : 'bg-slate-900/30 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span style={{ color: isActive ? j.color : undefined }}>{j.id}</span>
                    <span className="text-[9px] uppercase">{isActive ? 'Client Active' : 'Standby'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">{j.name}</div>
                  <div className="text-[10px] text-emerald-400 mt-2">✓ Raw Data Stays Local</div>
                  <div className="text-[10px] text-slate-400">↑ Uploads Model Delta (~1.2 KB)</div>
                </div>
              );
            })}
          </div>

          <div className="text-center text-indigo-400 mt-2">
            {"└────────────────────┴────────────────────┴────────────────────┘"}
          </div>
          <div className="text-center text-slate-500 mt-1">
            {"                    | (FedAvg Matrix Combination)                    "}
          </div>
          <div className="text-center font-semibold text-emerald-400 mt-1">
            ▼ New Updated Global Model Broadcasted to Edge Nodes
          </div>
        </div>
      </div>

      {/* Traffic Overview Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">48-Hour Traffic Flow Signatures</h2>
            <p className="text-xs text-slate-500">
              Diurnal rush-hour variations across participating urban intersections.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Morning Peak: 07:30 - 09:30</span>
            <span aria-hidden="true">·</span>
            <span>Evening Peak: 17:00 - 19:30</span>
          </div>
        </div>

        <MultiLineChart
          series={chartSeries}
          height={280}
          yLabel="Vehicles / Hour"
          xLabel="Time of Day"
        />
      </div>

      {/* Quick Launch & Next Step Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('prediction')}
          className="p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-1">
            Step 1 · Explore Forecasts
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Traffic Prediction Engine
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Compare actual sensor vehicle counts against Ridge regression predictions for each junction.
          </p>
          <div className="mt-3 flex items-center text-xs font-medium text-slate-700 gap-1">
            <span>Inspect curves</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('federated')}
          className="p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1">
            Step 2 · Collaborative Training
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
            Federated Learning Center
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Run multi-round FedAvg training across 2 to 4 clients and watch local weights synchronize.
          </p>
          <div className="mt-3 flex items-center text-xs font-medium text-slate-700 gap-1">
            <span>Run simulation</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => onNavigate('performance')}
          className="p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            Step 3 · Real-Time Audit
          </div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Model Performance & Bandwidth
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Watch real-time MAE & RMSE convergence alongside exact network communication cost.
          </p>
          <div className="mt-3 flex items-center text-xs font-medium text-slate-700 gap-1">
            <span>View live metrics</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
