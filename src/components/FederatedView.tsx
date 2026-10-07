import React, { useState } from 'react';
import { TrafficRecord, FederatedRoundResult, ModelParameters } from '../types/fl';
import { JUNCTIONS_METADATA } from '../services/trafficData';
import { Play, RotateCcw, CheckCircle2, Server, Smartphone, ArrowDown, ArrowUp } from 'lucide-react';

interface FederatedViewProps {
  records: TrafficRecord[];
  history: FederatedRoundResult[];
  activeClientIds: string[];
  onClientCountChange: (count: number) => void;
  isTraining: boolean;
  onRunBatchTraining: (rounds: number) => void;
  onRunSingleStep: () => void;
  onReset: () => void;
  globalWeights: ModelParameters | null;
}

export const FederatedView: React.FC<FederatedViewProps> = ({
  records,
  history,
  activeClientIds,
  onClientCountChange,
  isTraining,
  onRunBatchTraining,
  onRunSingleStep,
  onReset,
  globalWeights,
}) => {
  const [selectedRounds, setSelectedRounds] = useState<number>(5);
  const latestRound = history[history.length - 1];

  // Client stats
  const clientDataStats = JUNCTIONS_METADATA.map(j => {
    const jRecords = records.filter(r => r.junction_id === j.id);
    const splitIdx = Math.floor(jRecords.length * 0.8);
    const trainCount = splitIdx;
    const testCount = jRecords.length - splitIdx;
    const avgFlow = Math.round(jRecords.reduce((a, b) => a + b.vehicle_count, 0) / (jRecords.length || 1));
    const avgSpeed = Math.round((jRecords.reduce((a, b) => a + b.average_speed, 0) / (jRecords.length || 1)) * 10) / 10;
    const isActive = activeClientIds.includes(j.id);

    return {
      ...j,
      trainCount,
      testCount,
      avgFlow,
      avgSpeed,
      isActive,
    };
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Title & Training Controls Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-600 mb-1">
              <span>FEDERATED AVERAGING (FedAvg) ENGINE</span>
              <span aria-hidden="true">·</span>
              <span>SIMULATED EDGE CLIENTS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Federated Learning Training Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Coordinate distributed traffic nodes to train shared prediction models without exchanging raw sensor datasets.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              disabled={isTraining}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>

            <button
              onClick={onRunSingleStep}
              disabled={isTraining}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <span>+1 Single Round</span>
            </button>

            <button
              onClick={() => onRunBatchTraining(selectedRounds)}
              disabled={isTraining}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs ${
                isTraining
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
              <span>{isTraining ? 'Training in Progress...' : 'Start Federated Training'}</span>
            </button>
          </div>
        </div>

        {/* Hyperparameter Configuration Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {/* Client Count Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Participating Clients
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[2, 3, 4].map(count => (
                <button
                  key={count}
                  onClick={() => onClientCountChange(count)}
                  disabled={isTraining}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    activeClientIds.length === count
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {count} Clients
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Active: {activeClientIds.join(', ')}
            </span>
          </div>

          {/* Federated Rounds Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Federated Rounds
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {[1, 5, 10, 20].map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRounds(r)}
                  disabled={isTraining}
                  className={`flex-1 py-1 text-xs font-mono font-medium rounded-md transition-all ${
                    selectedRounds === r
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r} {r === 1 ? 'rnd' : 'rnds'}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Batched execution count
            </span>
          </div>

          {/* Aggregation Strategy */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Aggregation Strategy
            </label>
            <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
              FedAvg (Sample Weighted)
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block font-mono">
              W_t+1 = ∑ (n_k / N) · W_k
            </span>
          </div>

          {/* Security & Communication Guarantee */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Data Privacy Level
            </label>
            <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Isolated Local Storage</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Zero raw rows communicated
            </span>
          </div>
        </div>
      </div>

      {/* 8-Step Federated Learning Workflow Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-2xs">
        <h2 className="text-xs font-mono uppercase tracking-wider text-indigo-400 mb-3">
          Federated Round Execution Cycle (PS-003 Standard Pipeline)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
          {[
            { step: '1', title: 'Server Broadcast', desc: 'Sends global model', icon: ArrowDown },
            { step: '2', title: 'Local Train', desc: 'Trains on junction data', icon: Smartphone },
            { step: '3', title: 'Extract Delta', desc: 'Computes weights diff', icon: Server },
            { step: '4', title: 'Audit Upload', desc: '1.22 KB / client', icon: ArrowUp },
            { step: '5', title: 'FedAvg Sync', desc: 'Sample weighted average', icon: Server },
            { step: '6', title: 'Audit Download', desc: '1.22 KB broadcast', icon: ArrowDown },
            { step: '7', title: 'Global Update', desc: 'Stores updated vector', icon: CheckCircle2 },
            { step: '8', title: 'Evaluate MAE', desc: 'Evaluates test loss', icon: CheckCircle2 },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-lg flex flex-col items-center justify-center"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-[10px] font-bold mb-1">
                  {item.step}
                </div>
                <div className="font-semibold text-slate-200 text-[11px] truncate w-full">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate w-full">
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4 Simulated Client Junctions Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900">
            Simulated Edge Junction Clients
          </h2>
          <span className="text-xs text-slate-500">
            Each junction operates an isolated dataset and local training instance.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {clientDataStats.map((client, idx) => {
            const isParticipating = client.isActive;
            const clientMetrics = latestRound?.clientMetrics[client.id];

            return (
              <div
                key={client.id}
                className={`bg-white rounded-xl border p-4 transition-all shadow-2xs ${
                  isParticipating
                    ? 'border-slate-300 ring-1 ring-indigo-500/10'
                    : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: client.color }}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Client {idx + 1}</h3>
                      <span className="text-[11px] text-slate-500 font-mono">{client.id}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isParticipating
                        ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isParticipating ? 'Active' : 'Standby'}
                  </span>
                </div>

                {/* Subtitle & details */}
                <div className="mt-2.5 text-xs text-slate-600 font-medium truncate">
                  {client.name}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                  {client.description}
                </p>

                {/* Data metrics */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-mono">
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[9px] text-slate-400 block uppercase">Local Samples</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{client.trainCount} rows</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[9px] text-slate-400 block uppercase">Test Split</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{client.testCount} rows</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[9px] text-slate-400 block uppercase">Avg Flow</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{client.avgFlow} veh/h</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[9px] text-slate-400 block uppercase">Avg Speed</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{client.avgSpeed} km/h</span>
                  </div>
                </div>

                {/* Performance under Global Model */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 text-[11px]">Local Eval MAE:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {clientMetrics ? clientMetrics.mae.toFixed(2) : '--'}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-xs font-mono text-[10px] text-slate-400">
                  <span>Upload / Round:</span>
                  <span className="text-slate-600 font-medium">1.22 KB</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round-by-Round Training Progression Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Federated Training Round Logs
            </h2>
            <p className="text-xs text-slate-500">
              Audit log of each synchronization round, parameter distribution, and convergence metrics.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {history.length} Rounds Logged
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
            No federated rounds recorded yet. Click <strong>"Start Federated Training"</strong> above to launch the simulation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="pb-2 font-medium">Round</th>
                  <th className="pb-2 font-medium">Active Clients</th>
                  <th className="pb-2 font-medium">Global MAE</th>
                  <th className="pb-2 font-medium">Global RMSE</th>
                  <th className="pb-2 font-medium">Global R²</th>
                  <th className="pb-2 font-medium">Round Comm</th>
                  <th className="pb-2 font-medium">Cumulative Comm</th>
                  <th className="pb-2 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {history.map(r => (
                  <tr key={r.round} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-900">
                      Round #{r.round}
                    </td>
                    <td className="py-2.5 text-slate-700">
                      {r.clientsCount} Clients
                    </td>
                    <td className="py-2.5 font-semibold text-emerald-600">
                      {r.globalMetrics.mae.toFixed(3)}
                    </td>
                    <td className="py-2.5 text-slate-800">
                      {r.globalMetrics.rmse.toFixed(3)}
                    </td>
                    <td className="py-2.5 text-slate-600">
                      {r.globalMetrics.r2.toFixed(4)}
                    </td>
                    <td className="py-2.5 text-indigo-600">
                      {r.roundTotalKb.toFixed(1)} KB
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {r.cumulativeKb.toFixed(1)} KB
                    </td>
                    <td className="py-2.5 text-slate-400 font-sans text-[11px]">
                      {r.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
