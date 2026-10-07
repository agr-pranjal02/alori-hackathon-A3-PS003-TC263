# SmartFlow FL: Federated Traffic Flow Prediction & Communication Cost Analyzer
**Hackathon Problem Statement: PS-003**

> "SmartFlow FL demonstrates how distributed traffic locations can collaboratively improve traffic-flow prediction while keeping local datasets at their respective clients and explicitly measuring the communication required for federated training."

---

## 1. Problem Statement
Urban traffic management systems rely heavily on time-series telemetry collected from distributed sensor networks (inductive loops, computer-vision traffic cameras, and radar sensors). The standard paradigm requires streaming all granular local traffic logs into a central cloud repository. This poses severe challenges:
- **Data Privacy & Surveillance Concerns**: Continuous vehicle tracking can reveal resident travel habits and sensitive vehicular flow data.
- **Bandwidth Saturation**: Streaming millions of continuous sensor readings across dozens of municipal intersections strains municipal wireless / cellular bandwidth.
- **Data Sovereignty**: Autonomous traffic districts or private toll operators often cannot legally pool raw sensor data into third-party cloud infrastructure.

## 2. Problem Being Solved
SmartFlow FL solves the dilemma between **collective model intelligence** and **local data privacy**:
- Municipal traffic authorities want high-accuracy, predictive traffic forecasts across all urban junctions.
- However, raw localized sensor telemetry must not leave the edge devices situated at individual junctions.
- Furthermore, municipal network engineers must quantify the exact communication network cost (upload and download bandwidth) required for collaborative decentralized training.

## 3. Proposed Solution
SmartFlow FL implements a **Federated Learning (FL) framework** tailored for urban traffic flow prediction:
1. Four simulated edge junctions (**Junction A**, **Junction B**, **Junction C**, **Junction D**) maintain local, non-shared traffic datasets.
2. Each client junction trains a local machine learning regression model on its private sensor readings.
3. Edge clients transmit **only parameter updates (weights and intercepts)** to the centralized coordinator.
4. The central coordinator applies **Federated Averaging (FedAvg)** to generate an improved global model.
5. The global model is broadcast back to clients for subsequent rounds.
6. The platform explicitly measures, audits, and visualizes network payload sizes (upload, download, per-client, and cumulative) against a centralized baseline.

---

## 4. Federated Learning Concept
In traditional machine learning:
$$\text{Data} \xrightarrow{\quad\text{Network}\quad} \text{Central Server} \xrightarrow{\quad\text{Train}\quad} \text{Model}$$

In SmartFlow Federated Learning:
$$\text{Local Data} \xrightarrow{\quad\text{Private Local Train}\quad} \Delta W_k \xrightarrow{\quad\text{Secure Upload}\quad} \text{Global Aggregator}$$

### Federated Averaging (FedAvg) Formulation
At each federated communication round $t$:
1. The server distributes current global weights $W_t$ to active clients $k \in \{1, \dots, K\}$.
2. Each client trains on local samples $n_k$ producing local weights $W_{t+1}^k$.
3. The server computes the sample-weighted average:
$$W_{t+1} = \sum_{k=1}^K \frac{n_k}{N} W_{t+1}^k \quad \text{where } N = \sum_{k=1}^K n_k$$
4. Raw vehicular counts, timestamps, and speeds never leave their junction boundary.

---

## 5. System Architecture

```text
                           [ CENTRAL FEDERATED SERVER ]
                           - Holds Global Weight Vector
                           - Computes FedAvg Aggregation
                           - Audits Communication Telemetry
                                        |
       -------------------------------------------------------------------
       | (Download: Global Model)   |                            |
       v                            v                            v
 [ Junction A ]               [ Junction B ]               [ Junction C ]
 Downtown Hub                 Highway Arterial             Commercial Ring
 - Raw Sensor Logs            - Raw Sensor Logs            - Raw Sensor Logs
 - Local Training Engine      - Local Training Engine      - Local Training Engine
       | (Upload: Local Weights)    |                            |
       -------------------------------------------------------------------
                                        |
                                        v
                          [ IMPROVED GLOBAL MODEL ]
```

---

## 6. Technologies Used
- **Python 3.10+**: Core runtime environment.
- **Streamlit**: Web dashboard interface.
- **Pandas & NumPy**: Tabular data manipulation, time-series feature engineering, and matrix aggregation.
- **Scikit-learn**: Ridge Regression, StandardScaler, and regression evaluation metrics.
- **Plotly**: Interactive data visualizations for real-time convergence and network cost evaluation.
- **React / Vite / Tailwind CSS**: Real-time web application deployment in the AI Studio cloud runtime.

---

## 7. How to Install

```bash
# 1. Clone repository and navigate to smartflow-fl directory
cd smartflow-fl

# 2. Create virtual environment (optional but recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## 8. How to Run

```bash
# Launch Streamlit web dashboard
streamlit run app.py
```
Open your browser to the local URL (typically `http://localhost:8501`).

---

## 9. How Communication Cost is Calculated

Communication overhead is computed deterministically by measuring byte payloads for every network transmission:

### 1. Client Upload Payload ($S_{\text{up}}$)
Each client serializes its trained coefficient vector $W \in \mathbb{R}^d$, bias $b \in \mathbb{R}$, and scaler parameters $\mu, \sigma \in \mathbb{R}^d$.
$$S_{\text{up}} = \text{len}(\text{pickle}(W, b, \mu, \sigma)) \approx 1,240 \text{ Bytes} \approx 1.21 \text{ KB}$$

For $K$ participating clients in round $t$:
$$\text{Total Upload}_t = K \times S_{\text{up}}$$

### 2. Server Download Broadcast ($S_{\text{down}}$)
The coordinator serializes the aggregated global weights and broadcasts them to all $K$ clients:
$$\text{Total Download}_t = K \times S_{\text{down}}$$

### 3. Total Round & Cumulative Cost
$$\text{Round Total}_t = \text{Total Upload}_t + \text{Total Download}_t$$
$$\text{Cumulative Cost}_T = \sum_{t=1}^T \text{Round Total}_t$$

### Centralized Baseline Comparison
In the centralized approach, raw CSV records ($N$ rows with timestamps, speeds, counts, occupancy) are uploaded once:
$$\text{Raw Dataset Size} = \text{len}(\text{CSV.encode('utf-8')}) \approx 80 \text{ KB to } 500 \text{ KB}$$

> **Key Finding**: Federated learning does not inherently guarantee lower bandwidth over many rounds; rather, it introduces a predictable, bounded communication overhead in exchange for mathematical privacy.

---

## 10. Future Improvements
1. **Differential Privacy (DP-FedAvg)**: Introduce calibrated Gaussian noise to parameter updates to provide formal $(\epsilon, \delta)$-differential privacy guarantees.
2. **Model Compression & Quantization**: Use 8-bit or 16-bit weight quantization and gradient pruning (Top-K Sparsification) to reduce communication payloads by $>75\%$.
3. **Asynchronous FedAvg (FedAsync)**: Handle intermittent junction sensor disconnections and variable latency across edge clients.
4. **Graph Neural Networks (Fed-GNN)**: Incorporate spatio-temporal road topology connections between adjacent junctions.
