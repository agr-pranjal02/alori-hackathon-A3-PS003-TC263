/**
 * SmartFlow FL - Federated Traffic Flow Prediction & Communication Cost Analyzer
 * Hackathon Problem PS-003
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ActiveTab, TrafficRecord, FederatedRoundResult } from './types/fl';
import { generateSyntheticTrafficData, JUNCTIONS_METADATA } from './services/trafficData';
import {
  trainCentralizedBaseline,
  executeFederatedRound
} from './services/federatedEngine';
import { Navbar } from './components/Navbar';
import { OverviewView } from './components/OverviewView';
import { PredictionView } from './components/PredictionView';
import { FederatedView } from './components/FederatedView';
import { CommunicationView } from './components/CommunicationView';
import { PerformanceView } from './components/PerformanceView';
import { AboutView } from './components/AboutView';
import { CsvUploaderModal } from './components/CsvUploaderModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [trafficRecords, setTrafficRecords] = useState<TrafficRecord[]>(() =>
    generateSyntheticTrafficData(14)
  );

  // Active client count: 2, 3, or 4
  const [clientCount, setClientCount] = useState<number>(4);
  const activeClientIds = useMemo(() => {
    return JUNCTIONS_METADATA.slice(0, clientCount).map(j => j.id);
  }, [clientCount]);

  // Train Centralized Baseline once or whenever dataset changes
  const centralizedResult = useMemo(() => {
    return trainCentralizedBaseline(trafficRecords);
  }, [trafficRecords]);

  // Federated Training History & Current Model State
  const [history, setHistory] = useState<FederatedRoundResult[]>([]);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  // References to keep loop synchronized
  const historyRef = useRef<FederatedRoundResult[]>(history);
  historyRef.current = history;

  const currentGlobalWeights = useMemo(() => {
    if (history.length === 0) return null;
    return history[history.length - 1].globalWeights;
  }, [history]);

  // Execute a single federated training round
  const executeSingleRound = () => {
    const roundNumber = historyRef.current.length + 1;
    const prevWeights =
      historyRef.current.length > 0
        ? historyRef.current[historyRef.current.length - 1].globalWeights
        : null;

    const result = executeFederatedRound(
      roundNumber,
      activeClientIds,
      trafficRecords,
      prevWeights,
      centralizedResult.metrics
    );

    // Compute cumulative KB
    const prevCumulative =
      historyRef.current.length > 0
        ? historyRef.current[historyRef.current.length - 1].cumulativeKb
        : 0;
    result.cumulativeKb = Math.round((prevCumulative + result.roundTotalKb) * 10) / 10;

    const updated = [...historyRef.current, result];
    setHistory(updated);
    return result;
  };

  // Run batched animated training (updating dynamically round-by-round)
  const runBatchTraining = async (numRounds: number) => {
    if (isTraining) return;
    setIsTraining(true);

    for (let r = 0; r < numRounds; r++) {
      executeSingleRound();
      // Visual pacing delay for dynamic animation in real-time
      await new Promise(resolve => setTimeout(resolve, 320));
    }

    setIsTraining(false);
  };

  const handleReset = () => {
    if (isTraining) return;
    setHistory([]);
  };

  const handleClientCountChange = (count: number) => {
    setClientCount(count);
    // Reset rounds because client cohort changed
    setHistory([]);
  };

  const handleDatasetLoaded = (newRecords: TrafficRecord[]) => {
    setTrafficRecords(newRecords);
    setHistory([]);
  };

  const handleResetSynthetic = () => {
    setTrafficRecords(generateSyntheticTrafficData(14));
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isTraining={isTraining}
        onRunStep={() => runBatchTraining(1)}
        onReset={handleReset}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        currentRound={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'overview' && (
          <OverviewView
            records={trafficRecords}
            history={history}
            centralizedResult={centralizedResult}
            activeClientIds={activeClientIds}
            isTraining={isTraining}
            onNavigate={setActiveTab}
            onStartTraining={() => runBatchTraining(5)}
          />
        )}

        {activeTab === 'prediction' && (
          <PredictionView
            records={trafficRecords}
            centralizedResult={centralizedResult}
            globalWeights={currentGlobalWeights}
            activeClientIds={activeClientIds}
          />
        )}

        {activeTab === 'federated' && (
          <FederatedView
            records={trafficRecords}
            history={history}
            activeClientIds={activeClientIds}
            onClientCountChange={handleClientCountChange}
            isTraining={isTraining}
            onRunBatchTraining={runBatchTraining}
            onRunSingleStep={() => runBatchTraining(1)}
            onReset={handleReset}
            globalWeights={currentGlobalWeights}
          />
        )}

        {activeTab === 'communication' && (
          <CommunicationView
            history={history}
            centralizedResult={centralizedResult}
            onNavigateToFl={() => setActiveTab('federated')}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceView
            history={history}
            centralizedResult={centralizedResult}
            isTraining={isTraining}
            onRunBatchTraining={runBatchTraining}
            onRunSingleStep={() => runBatchTraining(1)}
            onReset={handleReset}
            activeClientCount={activeClientIds.length}
          />
        )}

        {activeTab === 'about' && <AboutView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">SmartFlow FL</span>
            <span>·</span>
            <span>Hackathon Problem PS-003</span>
            <span>·</span>
            <span>Federated Learning Simulation</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Client Isolated Datasets</span>
            <span>·</span>
            <span>FedAvg Parameter Aggregation</span>
            <span>·</span>
            <span>Deterministic Bandwidth Audit</span>
          </div>
        </div>
      </footer>

      {/* Dataset Uploader / Exporter Modal */}
      <CsvUploaderModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        currentRecords={trafficRecords}
        onDatasetLoaded={handleDatasetLoaded}
        onResetSynthetic={handleResetSynthetic}
      />
    </div>
  );
}
