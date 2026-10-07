import React, { useState } from 'react';
import { TrafficRecord } from '../types/fl';
import { parseTrafficCsv, exportTrafficToCsv } from '../services/trafficData';
import { X, Upload, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface CsvUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecords: TrafficRecord[];
  onDatasetLoaded: (records: TrafficRecord[]) => void;
  onResetSynthetic: () => void;
}

export const CsvUploaderModal: React.FC<CsvUploaderModalProps> = ({
  isOpen,
  onClose,
  currentRecords,
  onDatasetLoaded,
  onResetSynthetic,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseTrafficCsv(text);
        onDatasetLoaded(parsed);
        setSuccessMsg(`Successfully imported ${parsed.length} traffic records from ${file.name}`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportTrafficToCsv(currentRecords);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `smartflow_traffic_dataset_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Traffic Dataset Manager</h3>
            <p className="text-xs text-slate-500">Upload your own CSV or download the active dataset.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* File Upload Zone */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Upload Custom Traffic CSV
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">Click to select CSV or drag file here</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Required columns: timestamp, junction_id, vehicle_count, average_speed, occupancy, hour, day_of_week
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV ({currentRecords.length} rows)</span>
            </button>

            <button
              onClick={() => {
                onResetSynthetic();
                setSuccessMsg('Reset to synthetic 14-day 4-junction dataset.');
                setTimeout(onClose, 800);
              }}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Reset Default Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
