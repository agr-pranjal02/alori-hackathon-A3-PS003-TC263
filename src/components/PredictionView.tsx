import React, { useState, useMemo } from 'react';
import { TrafficRecord, ModelParameters, EvaluationMetrics, CentralizedBaselineResult } from '../types/fl';
import { JUNCTIONS_METADATA } from '../services/trafficData';
import { predictTraffic, computeMetrics, FEATURE_NAMES } from '../services/federatedEngine';
import { MultiLineChart } from './Charts';

interface PredictionViewProps {
  records: TrafficRecord[];
  centralizedResult: CentralizedBaselineResult;
  globalWeights: ModelParameters | null;
  activeClientIds: string[];
}

export const PredictionView: React.FC<PredictionViewProps> = ({
  records,
  centralizedResult,
  globalWeights,
  activeClientIds,
}) => {
  const [selectedJunctionId, setSelectedJunctionId] = useState<string>(activeClientIds[0] || 'Junction A');
  const [timeWindowHours, setTimeWindowHours] = useState<number>(48);

  const currentJunction = JUNCTIONS_METADATA.find(j => j.id === selectedJunctionId) || JUNCTIONS_METADATA[0];

  // Filter test split records for selected junction
  const { testRecords, metricsCentralized, metricsFederated, centralizedPreds, federatedPreds } = useMemo(() => {
    const jRecords = records.filter(r => r.junction_id === selectedJunctionId);
    const splitIdx = Math.floor(jRecords.length * 0.8);
    // Take slice from out-of-sample test set
    const testSlice = jRecords.slice(splitIdx, splitIdx + timeWindowHours);

    const actuals = testSlice.map(r => r.vehicle_count);
    const cPreds = predictTraffic(centralizedResult.weights, testSlice);
    const cMetrics = computeMetrics(actuals, cPreds);

    let fPreds: number[] = [];
    let fMetrics: EvaluationMetrics | null = null;

    if (globalWeights) {
      fPreds = predictTraffic(globalWeights, testSlice);
      fMetrics = computeMetrics(actuals, fPreds);
    }

    return {
      testRecords: testSlice,
      metricsCentralized: cMetrics,
      metricsFederated: fMetrics,
      centralizedPreds: cPreds,
      federatedPreds: fPreds,
    };
  }, [records, selectedJunctionId, timeWindowHours, centralizedResult.weights, globalWeights]);

  // Construct chart series
  const chartSeries = useMemo(() => {
    const series = [
      {
        id: 'actual',
        label: 'Actual Sensor Count',
        color: '#0f172a', // dark slate
        data: testRecords.map((r) => ({
          x: `${r.hour}:00`,
          y: r.vehicle_count,
        })),
        strokeWidth: 2.5,
      },
      {
        id: 'centralized',
        label: 'Centralized Baseline',
        color: '#3b82f6', // blue
        dashed: true,
        data: testRecords.map((r, i) => ({
          x: `${r.hour}:00`,
          y: centralizedPreds[i] ?? 0,
        })),
        strokeWidth: 2,
      },
    ];

    if (globalWeights && federatedPreds.length > 0) {
      series.push({
        id: 'federated',
        label: 'SmartFlow Federated (FL)',
        color: '#10b981', // emerald
        dashed: false,
        data: testRecords.map((r, i) => ({
          x: `${r.hour}:00`,
          y: federatedPreds[i] ?? 0,
        })),
        strokeWidth: 2.5,
      });
    }

    return series;
  }, [testRecords, centralizedPreds, federatedPreds, globalWeights]);

  // Feature weights display
  const activeWeights = globalWeights || centralizedResult.weights;
  const featureLabels = [
    'Hour of Day (Diurnal Phase)',
    'Day of Week (Weekend Shift)',
    'Lagged Vehicle Flow (t-1)',
    'Average Speed (km/h)',
    'Lane Occupancy (%)',
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Controls & Segmented Pickers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Traffic Prediction Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Compare model predictions against ground truth sensor vehicle counts on held-out test records.
          </p>
        </div>

        {/* Junction & Window Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Junction Selector Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {JUNCTIONS_METADATA.map(j => {
              const isSelected = selectedJunctionId === j.id;
              return (
                <button
                  key={j.id}
                  onClick={() => setSelectedJunctionId(j.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {j.id}
                </button>
              );
            })}
          </div>

          {/* Window size buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[24, 48, 72].map(hours => (
              <button
                key={hours}
                onClick={() => setTimeWindowHours(hours)}
                className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
                  timeWindowHours === hours
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Junction Description Header */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-0.5">
            <span>SELECTED CORRIDOR</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-700">{currentJunction.name}</span>
          </div>
          <p className="text-xs text-slate-600">{currentJunction.description}</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">BASE FLOW</span>
            <span className="font-semibold text-slate-900 tabular-nums">{currentJunction.baseFlow} veh/h</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">BASE SPEED</span>
            <span className="font-semibold text-slate-900 tabular-nums">{currentJunction.speedBase} km/h</span>
          </div>
        </div>
      </div>

      {/* Actual vs Predicted Graph */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Actual vs Predicted Hourly Vehicle Flow
            </h2>
            <p className="text-xs text-slate-500">
              Visualizing {timeWindowHours} consecutive hours of traffic evaluation for {currentJunction.name}.
            </p>
          </div>
          {!globalWeights && (
            <div className="text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Federated model not trained yet — showing Centralized Baseline only
            </div>
          )}
        </div>

        <MultiLineChart
          series={chartSeries}
          height={320}
          yLabel="Vehicle Count (veh/h)"
          xLabel="Hour Window"
        />
      </div>

      {/* Quantitative Error Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Centralized Baseline Metrics Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono text-blue-600 font-medium">BENCHMARK</span>
              <h3 className="text-sm font-bold text-slate-900">Centralized Baseline Model</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Ridge (Pooled Data)</span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-mono">MAE</span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {metricsCentralized.mae.toFixed(2)}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-mono">RMSE</span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {metricsCentralized.rmse.toFixed(2)}
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-mono">MAPE</span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {metricsCentralized.mape.toFixed(1)}%
              </span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <span className="text-[10px] text-slate-400 block font-mono">R² SCORE</span>
              <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                {metricsCentralized.r2.toFixed(3)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Trained on pooled dataset requires 100% raw data transmission to central cloud.
          </p>
        </div>

        {/* Federated Learning Metrics Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono text-emerald-600 font-medium">PRIVACY-PRESERVING</span>
              <h3 className="text-sm font-bold text-slate-900">SmartFlow FL Model (Global)</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">FedAvg Aggregated</span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-mono">MAE</span>
              <span className="text-lg font-bold font-mono text-emerald-950 tabular-nums">
                {metricsFederated ? metricsFederated.mae.toFixed(2) : '--'}
              </span>
            </div>
            <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-mono">RMSE</span>
              <span className="text-lg font-bold font-mono text-emerald-950 tabular-nums">
                {metricsFederated ? metricsFederated.rmse.toFixed(2) : '--'}
              </span>
            </div>
            <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-mono">MAPE</span>
              <span className="text-lg font-bold font-mono text-emerald-950 tabular-nums">
                {metricsFederated ? `${metricsFederated.mape.toFixed(1)}%` : '--'}
              </span>
            </div>
            <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-mono">R² SCORE</span>
              <span className="text-lg font-bold font-mono text-emerald-950 tabular-nums">
                {metricsFederated ? metricsFederated.r2.toFixed(3) : '--'}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Trained collaboratively; raw vehicular records never left the edge sensor domain.
          </p>
        </div>
      </div>

      {/* Feature Influence Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Learned Spatio-Temporal Regression Coefficients
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Shows how each input feature drives future vehicle count predictions in the active model.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono">
                <th className="pb-2 font-medium">Feature</th>
                <th className="pb-2 font-medium">Standardized Weight (β)</th>
                <th className="pb-2 font-medium">Impact Direction</th>
                <th className="pb-2 font-medium">Standardizer Mean (μ)</th>
                <th className="pb-2 font-medium">Standardizer Scale (σ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {FEATURE_NAMES.map((fName, idx) => {
                const w = activeWeights.weights[idx] || 0;
                const isPositive = w >= 0;
                return (
                  <tr key={fName} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-sans font-medium text-slate-800">
                      {featureLabels[idx]}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900 tabular-nums">
                      {w > 0 ? `+${w.toFixed(3)}` : w.toFixed(3)}
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center text-[11px] font-medium ${
                        isPositive ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {isPositive ? '▲ Direct Positive' : '▼ Inverse Flow'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 tabular-nums">
                      {activeWeights.scalerMean[idx]?.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-slate-500 tabular-nums">
                      {activeWeights.scalerStd[idx]?.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
