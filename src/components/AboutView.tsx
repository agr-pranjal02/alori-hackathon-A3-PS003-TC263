import React, { useState } from 'react';
import { Copy, Check, Terminal, Download, FileCode, CheckCircle2 } from 'lucide-react';

export const AboutView: React.FC = () => {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [selectedFileTab, setSelectedFileTab] = useState<string>('app.py');

  const copyToClipboard = (text: string, filename: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const samplePythonAppCode = `# SmartFlow FL - Streamlit Application
# Run locally using: streamlit run app.py

import streamlit as st
import pandas as pd
from data.generate_data import generate_all_traffic_data
from models.traffic_model import CentralizedBaselineModel
from models.federated import SimulatedTrafficClient, FedAvgCoordinator

st.set_page_config(page_title="SmartFlow FL", layout="wide")
st.title("🚦 SmartFlow FL: Federated Traffic Flow Prediction")

# Load traffic data across 4 junctions
df = generate_all_traffic_data(days=14)
st.write(f"Loaded {len(df)} simulated sensor records.")
`;

  const sampleFederatedCode = `# models/federated.py
import numpy as np

class FedAvgCoordinator:
    def __init__(self, clients, global_test_df):
        self.clients = clients
        self.global_test_df = global_test_df
        self.global_weights = None

    def aggregate_parameters(self, client_updates):
        """Weighted Federated Averaging: W = sum((n_k / N) * W_k)"""
        total_samples = sum(item[1] for item in client_updates)
        new_coef = np.zeros_like(client_updates[0][2]["coef"])
        new_intercept = 0.0

        for _, sample_count, weights in client_updates:
            weight_factor = sample_count / total_samples
            new_coef += weight_factor * weights["coef"]
            new_intercept += weight_factor * weights["intercept"]

        return {"coef": new_coef, "intercept": new_intercept}
`;

  const sampleCommCode = `# utils/communication.py
import pickle

def estimate_model_payload_size(weights: dict) -> int:
    """Calculates byte size of serialized parameter tensors."""
    return len(pickle.dumps(weights))

class CommunicationTracker:
    def log_round(self, round_num, client_count, client_upload_bytes, server_download_bytes):
        total_upload = client_upload_bytes * client_count
        total_download = server_download_bytes * client_count
        return {
            "round": round_num,
            "round_total_kb": round((total_upload + total_download) / 1024, 2)
        }
`;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Title */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 mb-1">
          <span>HACKATHON PROBLEM STATEMENT PS-003</span>
          <span aria-hidden="true">·</span>
          <span>SYSTEM ARCHITECTURE & DOCUMENTATION</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          About SmartFlow FL
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Federated Traffic Flow Prediction with Communication-Cost Evaluation.
        </p>
      </div>

      {/* 10-Point Project Documentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
        {/* 1. Problem Statement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">1</span>
            Problem Statement
          </h2>
          <p>
            Modern smart cities gather thousands of vehicular speed, occupancy, and count signals every minute.
            Streaming all high-resolution traffic data to a central cloud server introduces severe surveillance risks,
            cellular network bottlenecks, and regulatory violations.
          </p>
        </div>

        {/* 2. Problem Being Solved */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">2</span>
            Problem Being Solved
          </h2>
          <p>
            Municipalities need city-wide predictive traffic models for intelligent signal timing and congestion alleviation,
            while ensuring raw sensor data never departs its local origin junction and auditing the network bandwidth costs.
          </p>
        </div>

        {/* 3. Proposed Solution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">3</span>
            Proposed Solution
          </h2>
          <p>
            SmartFlow FL coordinates decentralized edge learning. Each simulated intersection trains local regression
            models on its local sensor logs. Only small mathematical weight tensors are uploaded to a central coordinator
            that executes Federated Averaging (FedAvg).
          </p>
        </div>

        {/* 4. Federated Learning Concept */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">4</span>
            Federated Learning (FedAvg)
          </h2>
          <p>
            Instead of bringing data to the model, we bring the model to the data:
            <code className="block bg-slate-100 p-2 rounded mt-1.5 font-mono text-[11px] text-slate-800">
              W_global = ∑ (n_k / N) · W_k
            </code>
            Edge clients download the global model, fit local epochs on private telemetry, and transmit the delta back.
          </p>
        </div>

        {/* 5. System Architecture */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">5</span>
            System Architecture
          </h2>
          <p>
            • 4 Edge Clients: Junction A (Downtown), Junction B (Highway), Junction C (Commercial), Junction D (Residential).<br />
            • Central Coordinator: Orchestrates parameter aggregation and audits communication bytes.<br />
            • Communication Tracker: Logs uplink, downlink, and cumulative payload sizes.
          </p>
        </div>

        {/* 6. Technologies Used */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">6</span>
            Technologies Used
          </h2>
          <p>
            • Python 3.10+, Streamlit, Pandas, NumPy, Scikit-learn, Plotly for local execution.<br />
            • React 19, TypeScript, Tailwind CSS, Vite for live AI Studio web application deployment.
          </p>
        </div>

        {/* 7 & 8. How to Install & Run */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">7-8</span>
            Installation & Run Command
          </h2>
          <div className="bg-slate-900 text-slate-200 p-2.5 rounded font-mono text-[11px] space-y-1">
            <div className="text-emerald-400"># 1. Install dependencies</div>
            <div>pip install -r requirements.txt</div>
            <div className="text-emerald-400 pt-1"># 2. Launch Streamlit UI</div>
            <div>streamlit run app.py</div>
          </div>
        </div>

        {/* 9. Communication Cost Calculation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-[10px]">9</span>
            Communication Cost Calculation
          </h2>
          <p>
            Calculated directly from serialized parameter sizes (weights, bias, scaler means, standard deviations) plus protocol message envelope = 1,248 bytes (~1.22 KB) per transmission.
            Round Total = Clients × (Upload + Download).
          </p>
        </div>
      </div>

      {/* Codebase Inspector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-600" />
              Python Project Codebase (`smartflow-fl/`)
            </h2>
            <p className="text-xs text-slate-500">
              The project is structured with modular files ready for local Python/Streamlit execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const code = selectedFileTab === 'app.py' ? samplePythonAppCode : selectedFileTab === 'federated.py' ? sampleFederatedCode : sampleCommCode;
                copyToClipboard(code, selectedFileTab);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copiedFile === selectedFileTab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFile === selectedFileTab ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* File tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 mb-3 overflow-x-auto text-xs">
          {[
            { id: 'app.py', label: 'app.py (Streamlit)' },
            { id: 'federated.py', label: 'models/federated.py' },
            { id: 'communication.py', label: 'utils/communication.py' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedFileTab(tab.id)}
              className={`px-3 py-1.5 font-mono rounded-md font-medium transition-colors ${
                selectedFileTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code View */}
        <div className="bg-slate-950 text-slate-200 p-4 rounded-lg font-mono text-xs overflow-x-auto">
          <pre>
            {selectedFileTab === 'app.py' && samplePythonAppCode}
            {selectedFileTab === 'federated.py' && sampleFederatedCode}
            {selectedFileTab === 'communication.py' && sampleCommCode}
          </pre>
        </div>
      </div>

      {/* Mandatory Final Conclusion Message Box */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-900 font-mono">
              Final Hackathon PS-003 Verdict
            </h3>
            <p className="text-base font-semibold text-emerald-950 leading-relaxed">
              "SmartFlow FL demonstrates how distributed traffic locations can collaboratively improve traffic-flow prediction while keeping local datasets at their respective clients and explicitly measuring the communication required for federated training."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
