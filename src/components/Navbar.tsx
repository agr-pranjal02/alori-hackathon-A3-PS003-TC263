import React from 'react';
import { ActiveTab } from '../types/fl';
import { Play, RotateCcw, UploadCloud } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isTraining: boolean;
  onRunStep: () => void;
  onReset: () => void;
  onOpenCsvModal: () => void;
  currentRound: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isTraining,
  onRunStep,
  onReset,
  onOpenCsvModal,
  currentRound,
}) => {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'prediction', label: 'Traffic Prediction' },
    { id: 'federated', label: 'Federated Learning' },
    { id: 'communication', label: 'Communication Cost' },
    { id: 'performance', label: 'Model Performance' },
    { id: 'about', label: 'About Project' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark (Single Text Element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('overview')}
            className="text-lg font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors text-left"
          >
            SmartFlow FL
          </button>
          <span className="hidden lg:inline text-xs text-slate-400 font-mono">
            PS-003 · FedAvg Network
          </span>
        </div>

        {/* Zone 2: Navigation Links (Clean text with active indicator) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenCsvModal}
            title="Upload Custom CSV or Download Dataset"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Dataset</span>
          </button>

          <button
            onClick={onReset}
            title="Reset training simulation"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onRunStep}
            disabled={isTraining}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white rounded-lg shadow-xs transition-colors ${
              isTraining
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Training...' : currentRound === 0 ? 'Start Training' : 'Run Round'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-slate-100 gap-1 bg-slate-50">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-2.5 py-1 text-xs whitespace-nowrap rounded font-medium ${
              activeTab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
