"""
SmartFlow FL: Federated Traffic Flow Prediction & Communication Cost Analyzer
Hackathon Problem PS-003

A smart-city traffic prediction platform demonstrating how multiple traffic junctions
collaboratively train machine-learning models using federated learning without sharing raw data.
"""

import sys
import os
import time
import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go

# Add current path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from data.generate_data import generate_all_traffic_data, generate_junction_data, JUNCTIONS
from models.traffic_model import LocalTrafficModel, CentralizedBaselineModel, FEATURE_COLS, TARGET_COL
from models.federated import SimulatedTrafficClient, FedAvgCoordinator
from utils.communication import estimate_raw_data_size
from utils.metrics import evaluate_model

# Streamlit Page Config
st.set_page_config(
    page_title="SmartFlow FL - Federated Traffic Flow Prediction",
    page_icon="🚦",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .metric-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .metric-value {
        font-family: 'Courier New', monospace;
        font-size: 1.8rem;
        font-weight: 700;
        color: #0f172a;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)

# ----------------- SESSION STATE INITIALIZATION -----------------
if "traffic_df" not in st.session_state:
    st.session_state.traffic_df = generate_all_traffic_data(days=14, seed=42)

if "centralized_model" not in st.session_state:
    df = st.session_state.traffic_df
    split = int(len(df) * 0.8)
    train_df = df.iloc[:split]
    test_df = df.iloc[split:]
    
    base_model = CentralizedBaselineModel(model_type="ridge")
    base_model.fit(train_df[FEATURE_COLS], train_df[TARGET_COL])
    base_metrics = base_model.evaluate(test_df[FEATURE_COLS], test_df[TARGET_COL])
    raw_size_bytes = estimate_raw_data_size(train_df)
    
    st.session_state.centralized_model = base_model
    st.session_state.centralized_metrics = base_metrics
    st.session_state.centralized_train_size = len(train_df)
    st.session_state.raw_data_bytes = raw_size_bytes

if "fl_coordinator" not in st.session_state:
    df = st.session_state.traffic_df
    split = int(len(df) * 0.8)
    global_test = df.iloc[split:]
    
    clients = []
    for j_id in JUNCTIONS.keys():
        j_df = df[df["junction_id"] == j_id].copy()
        clients.append(SimulatedTrafficClient(j_id, j_df))
        
    st.session_state.fl_coordinator = FedAvgCoordinator(clients, global_test)
    st.session_state.fl_trained_rounds = 0
    st.session_state.fl_training_history = []
    st.session_state.training_status = "Ready (Untrained)"

# ----------------- SIDEBAR CONTROLS -----------------
st.sidebar.markdown("## 🚦 SmartFlow FL")
st.sidebar.caption("Federated Traffic Flow Prediction & Communication Cost Analyzer")
st.sidebar.markdown("---")

section = st.sidebar.radio(
    "Navigation",
    [
        "1. Overview",
        "2. Traffic Prediction",
        "3. Federated Learning",
        "4. Communication Cost",
        "5. Model Performance",
        "6. About the Project"
    ]
)

st.sidebar.markdown("---")
st.sidebar.markdown("### ⚙️ Simulation Controls")

selected_clients_count = st.sidebar.selectbox("Number of Active Clients", [2, 3, 4], index=2)
selected_rounds = st.sidebar.selectbox("Federated Rounds", [1, 5, 10, 20], index=1)

active_junction_list = list(JUNCTIONS.keys())[:selected_clients_count]
st.sidebar.info(f"Active Junctions: {', '.join(active_junction_list)}")

# CSV Uploader Option
uploaded_file = st.sidebar.file_uploader("Upload Custom Traffic CSV", type=["csv"])
if uploaded_file is not None:
    try:
        user_df = pd.read_csv(uploaded_file)
        required_cols = {"timestamp", "junction_id", "vehicle_count", "average_speed", "occupancy", "hour", "day_of_week"}
        if required_cols.issubset(set(user_df.columns)):
            if "prev_vehicle_count" not in user_df.columns:
                user_df["prev_vehicle_count"] = user_df["vehicle_count"].shift(1).fillna(user_df["vehicle_count"].mean())
            st.session_state.traffic_df = user_df
            st.sidebar.success(f"Loaded custom dataset: {len(user_df)} rows")
        else:
            missing = required_cols - set(user_df.columns)
            st.sidebar.error(f"Missing columns: {missing}")
    except Exception as e:
        st.sidebar.error(f"Error parsing CSV: {e}")

# Reset button
if st.sidebar.button("Reset Simulation"):
    st.session_state.traffic_df = generate_all_traffic_data(days=14, seed=int(time.time()))
    df = st.session_state.traffic_df
    split = int(len(df) * 0.8)
    clients = [SimulatedTrafficClient(j_id, df[df["junction_id"] == j_id].copy()) for j_id in JUNCTIONS.keys()]
    st.session_state.fl_coordinator = FedAvgCoordinator(clients, df.iloc[split:])
    st.session_state.fl_trained_rounds = 0
    st.session_state.fl_training_history = []
    st.session_state.training_status = "Ready (Reset)"
    st.rerun()

# ----------------- SECTION 1: OVERVIEW -----------------
if section == "1. Overview":
    st.title("SmartFlow FL Dashboard")
    st.subheader("Federated Traffic Flow Prediction & Communication Cost Analyzer")
    st.caption("PS-003: Smart-city collaborative traffic modeling without sharing raw local traffic records.")

    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("Junctions", f"{selected_clients_count} active / 4 total")
    with col2:
        st.metric("Federated Rounds", f"{st.session_state.fl_trained_rounds} completed")
    with col3:
        avg_traffic = int(st.session_state.traffic_df["vehicle_count"].mean())
        st.metric("Avg Vehicle Flow", f"{avg_traffic} veh/hr")
    with col4:
        best_mae = (
            f"{st.session_state.fl_training_history[-1]['global_mae']:.2f}"
            if st.session_state.fl_training_history
            else "N/A"
        )
        st.metric("Current FL MAE", best_mae)
    with col5:
        total_comm = (
            f"{st.session_state.fl_coordinator.comm_tracker.get_total_kb():.1f} KB"
            if st.session_state.fl_trained_rounds > 0
            else "0.0 KB"
        )
        st.metric("Comm Cost", total_comm)

    st.markdown("---")
    st.markdown("### System Architecture (Privacy-Preserving Federated Network)")
    st.code("""
                         [ CENTRAL FEDERATED SERVER ]
                                      |
         ----------------------------------------------------------
         | (Global Model)             | (Global Model)            |
         v                            v                           v
   [ Junction A ]               [ Junction B ]              [ Junction C ]
   - Local Sensor Data          - Local Sensor Data         - Local Sensor Data
   - Local Ridge Model          - Local Ridge Model         - Local Ridge Model
         | (Model Weights)            | (Model Weights)           | (Model Weights)
         ----------------------------------------------------------
                                      | (FedAvg Aggregation)
                                      v
                         [ IMPROVED GLOBAL MODEL ]
    """, language="text")

    st.markdown("### Traffic Overview Across Junctions")
    sample_df = st.session_state.traffic_df.head(168 * len(active_junction_list))
    fig = px.line(
        sample_df,
        x="timestamp",
        y="vehicle_count",
        color="junction_id",
        title="Hourly Vehicle Count Patterns (First 7 Days Sample)",
        labels={"vehicle_count": "Vehicles / Hour", "timestamp": "Timestamp"}
    )
    fig.update_layout(template="plotly_white", hovermode="x unified")
    st.plotly_chart(fig, use_container_width=True)

# ----------------- SECTION 2: TRAFFIC PREDICTION -----------------
elif section == "2. Traffic Prediction":
    st.title("Traffic Flow Prediction Engine")
    st.caption("Forecasting hourly vehicle counts using junction spatio-temporal features.")

    sel_j = st.selectbox("Inspect Junction", active_junction_list)
    j_df = st.session_state.traffic_df[st.session_state.traffic_df["junction_id"] == sel_j].copy()
    split = int(len(j_df) * 0.8)
    test_slice = j_df.iloc[split:].head(72).copy()  # 72 hours forecast window

    # Make predictions with available models
    baseline_preds = st.session_state.centralized_model.predict(test_slice[FEATURE_COLS])
    test_slice["Centralized_Pred"] = baseline_preds
    
    if st.session_state.fl_coordinator.global_weights is not None:
        eval_fl = LocalTrafficModel()
        eval_fl.set_parameters(st.session_state.fl_coordinator.global_weights)
        test_slice["Federated_Pred"] = eval_fl.predict(test_slice[FEATURE_COLS])
    else:
        test_slice["Federated_Pred"] = test_slice["Centralized_Pred"] * 0.95

    m_col1, m_col2, m_col3 = st.columns(3)
    central_err = evaluate_model(test_slice["vehicle_count"], test_slice["Centralized_Pred"])
    fl_err = evaluate_model(test_slice["vehicle_count"], test_slice["Federated_Pred"])
    
    with m_col1:
        st.metric("Test Actual Mean", f"{test_slice['vehicle_count'].mean():.1f} veh/h")
    with m_col2:
        st.metric("Centralized Baseline MAE", f"{central_err['mae']:.2f}")
    with m_col3:
        status_label = f"{fl_err['mae']:.2f}" if st.session_state.fl_coordinator.global_weights else "Untrained"
        st.metric("Federated Model MAE", status_label)

    # Plot Actual vs Predicted
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=test_slice["timestamp"], y=test_slice["vehicle_count"], mode="lines+markers", name="Actual Traffic", line=dict(color="#0f172a", width=2)))
    fig.add_trace(go.Scatter(x=test_slice["timestamp"], y=test_slice["Centralized_Pred"], mode="lines", name="Centralized Baseline", line=dict(color="#3b82f6", dash="dash")))
    if st.session_state.fl_coordinator.global_weights is not None:
        fig.add_trace(go.Scatter(x=test_slice["timestamp"], y=test_slice["Federated_Pred"], mode="lines", name="Federated FL Prediction", line=dict(color="#10b981", width=2)))
    
    fig.update_layout(title=f"72-Hour Traffic Forecast for {sel_j}", xaxis_title="Timestamp", yaxis_title="Vehicles / Hour", template="plotly_white")
    st.plotly_chart(fig, use_container_width=True)

# ----------------- SECTION 3: FEDERATED LEARNING -----------------
elif section == "3. Federated Learning":
    st.title("Federated Learning Training Center")
    st.caption("Train global model via Federated Averaging (FedAvg) without exposing client datasets.")

    st.write(f"**Target Setup:** {selected_clients_count} Clients participating, {selected_rounds} Rounds planned.")

    train_btn = st.button("🚀 Start Federated Training", type="primary")

    if train_btn:
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        # Live metric containers for real-time tracking
        col_m1, col_m2, col_m3 = st.columns(3)
        m1_placeholder = col_m1.empty()
        m2_placeholder = col_m2.empty()
        m3_placeholder = col_m3.empty()
        
        # Real-time chart placeholder
        chart_placeholder = st.empty()
        
        rounds_data = []
        for r_step in range(1, selected_rounds + 1):
            status_text.text(f"Executing Federated Round {r_step} / {selected_rounds}...")
            round_res = st.session_state.fl_coordinator.run_training_round(
                round_num=len(st.session_state.fl_training_history) + 1,
                active_junction_ids=active_junction_list
            )
            st.session_state.fl_training_history.append(round_res)
            st.session_state.fl_trained_rounds += 1
            rounds_data.append(round_res)
            
            # Dynamic real-time metrics update
            m1_placeholder.metric("Current Round", f"{st.session_state.fl_trained_rounds}")
            m2_placeholder.metric("Global FL MAE", f"{round_res['global_mae']:.3f}")
            m3_placeholder.metric("Cumulative Comm", f"{round_res['comm_cumulative_kb']:.1f} KB")
            
            # Dynamic chart update
            hist_df = pd.DataFrame(st.session_state.fl_training_history)
            fig_live = px.line(
                hist_df,
                x="round",
                y="global_mae",
                markers=True,
                title="Real-Time Federated Model MAE Convergence",
                labels={"round": "Round", "global_mae": "MAE"}
            )
            fig_live.add_hline(
                y=st.session_state.centralized_metrics["mae"],
                line_dash="dot",
                annotation_text="Centralized Baseline",
                line_color="#ef4444"
            )
            fig_live.update_layout(template="plotly_white")
            chart_placeholder.plotly_chart(fig_live, use_container_width=True)
            
            progress_bar.progress(int((r_step / selected_rounds) * 100))
            time.sleep(0.35)  # Visual pacing for demo
            
        status_text.success(f"Successfully finished {selected_rounds} federated rounds!")
        st.session_state.training_status = f"Completed ({st.session_state.fl_trained_rounds} Rounds)"
        
    if st.session_state.fl_training_history:
        st.markdown("### Training Round Logs")
        rounds_table = []
        for r in st.session_state.fl_training_history:
            rounds_table.append({
                "Round": r["round"],
                "Clients": r["clients_count"],
                "Global MAE": r["global_mae"],
                "Global RMSE": r["global_rmse"],
                "Round Comm (KB)": r["comm_round_total_kb"],
                "Cumulative Comm (KB)": r["comm_cumulative_kb"]
            })
        st.dataframe(pd.DataFrame(rounds_table), use_container_width=True)

# ----------------- SECTION 4: COMMUNICATION COST -----------------
elif section == "4. Communication Cost":
    st.title("Communication Cost Evaluation")
    st.caption("Quantitative audit of network data transmission overhead in Federated Learning.")

    if not st.session_state.fl_training_history:
        st.warning("No federated rounds completed yet. Please start training in the 'Federated Learning' section first.")
    else:
        df_comm = st.session_state.fl_coordinator.comm_tracker.get_summary_dataframe()
        
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.metric("Total Upload", f"{df_comm['total_upload_kb'].sum():.1f} KB")
        with c2:
            st.metric("Total Download", f"{df_comm['total_download_kb'].sum():.1f} KB")
        with c3:
            st.metric("Total Comm Cost", f"{df_comm['round_total_kb'].sum():.1f} KB")
        with c4:
            raw_kb = st.session_state.raw_data_bytes / 1024
            st.metric("Raw Dataset Size", f"{raw_kb:.1f} KB")

        st.markdown("### Round-by-Round Communication Breakdown")
        st.dataframe(
            df_comm[["round", "clients", "upload_per_client_kb", "total_upload_kb", "download_per_client_kb", "total_download_kb", "round_total_kb", "cumulative_kb"]],
            use_container_width=True
        )

        st.markdown("### Communication Cost vs Federated Rounds")
        fig_comm = go.Figure()
        fig_comm.add_trace(go.Bar(x=df_comm["round"], y=df_comm["round_total_kb"], name="Per-Round Total (KB)", marker_color="#6366f1"))
        fig_comm.add_trace(go.Scatter(x=df_comm["round"], y=df_comm["cumulative_kb"], name="Cumulative (KB)", mode="lines+markers", line=dict(color="#f59e0b", width=3), yaxis="y2"))
        
        fig_comm.update_layout(
            title="Communication Overhead per Round and Cumulative Growth",
            xaxis_title="Federated Round",
            yaxis=dict(title="Round Cost (KB)"),
            yaxis2=dict(title="Cumulative Cost (KB)", overlaying="y", side="right"),
            template="plotly_white"
        )
        st.plotly_chart(fig_comm, use_container_width=True)

# ----------------- SECTION 5: MODEL PERFORMANCE (ENHANCED REAL-TIME) -----------------
elif section == "5. Model Performance":
    st.title("Model Performance & Head-to-Head Comparison")
    st.caption("Live comparison between Centralized Baseline and Federated Learning (MAE & RMSE tracking).")

    # Real-Time Training Trigger directly in Performance Tab
    col_ctrl1, col_ctrl2, col_ctrl3 = st.columns([2, 1, 1])
    with col_ctrl1:
        st.info("Execute federated rounds directly here to inspect live dynamic updates to MAE and RMSE!")
    with col_ctrl2:
        rounds_to_run = st.selectbox("Rounds to Run", [1, 5, 10], index=1, key="perf_rounds")
    with col_ctrl3:
        run_perf_btn = st.button("▶ Run & Watch Live", type="primary", key="btn_run_perf")

    # Real-time placeholders
    rt_metrics_box = st.container()
    rt_chart_mae = st.empty()
    rt_chart_rmse = st.empty()

    if run_perf_btn:
        perf_progress = st.progress(0)
        for i in range(1, rounds_to_run + 1):
            round_res = st.session_state.fl_coordinator.run_training_round(
                round_num=len(st.session_state.fl_training_history) + 1,
                active_junction_ids=active_junction_list
            )
            st.session_state.fl_training_history.append(round_res)
            st.session_state.fl_trained_rounds += 1
            
            # Live Metrics
            with rt_metrics_box:
                m_c1, m_c2, m_c3, m_c4 = st.columns(4)
                m_c1.metric("Current Round", f"{st.session_state.fl_trained_rounds}")
                m_c2.metric("FL Global MAE", f"{round_res['global_mae']:.3f}", delta=f"{round_res['global_mae'] - st.session_state.centralized_metrics['mae']:.3f}", delta_color="inverse")
                m_c3.metric("FL Global RMSE", f"{round_res['global_rmse']:.3f}", delta=f"{round_res['global_rmse'] - st.session_state.centralized_metrics['rmse']:.3f}", delta_color="inverse")
                m_c4.metric("Centralized Baseline MAE", f"{st.session_state.centralized_metrics['mae']:.3f}")
                
            # Dynamic MAE Chart
            h_df = pd.DataFrame(st.session_state.fl_training_history)
            fig_mae = go.Figure()
            fig_mae.add_trace(go.Scatter(x=h_df["round"], y=h_df["global_mae"], mode="lines+markers", name="Federated Global MAE", line=dict(color="#10b981", width=3)))
            fig_mae.add_hline(y=st.session_state.centralized_metrics["mae"], line_dash="dash", line_color="#ef4444", annotation_text="Centralized Baseline MAE")
            fig_mae.update_layout(title="Real-Time MAE Convergence Across Rounds", xaxis_title="Round", yaxis_title="MAE (Vehicles/Hour)", template="plotly_white")
            rt_chart_mae.plotly_chart(fig_mae, use_container_width=True)
            
            # Dynamic RMSE Chart
            fig_rmse = go.Figure()
            fig_rmse.add_trace(go.Scatter(x=h_df["round"], y=h_df["global_rmse"], mode="lines+markers", name="Federated Global RMSE", line=dict(color="#3b82f6", width=3)))
            fig_rmse.add_hline(y=st.session_state.centralized_metrics["rmse"], line_dash="dash", line_color="#dc2626", annotation_text="Centralized Baseline RMSE")
            fig_rmse.update_layout(title="Real-Time RMSE Convergence Across Rounds", xaxis_title="Round", yaxis_title="RMSE (Vehicles/Hour)", template="plotly_white")
            rt_chart_rmse.plotly_chart(fig_rmse, use_container_width=True)
            
            perf_progress.progress(int((i / rounds_to_run) * 100))
            time.sleep(0.3)
            
    elif st.session_state.fl_training_history:
        # Static display of existing history
        h_df = pd.DataFrame(st.session_state.fl_training_history)
        fig_mae = go.Figure()
        fig_mae.add_trace(go.Scatter(x=h_df["round"], y=h_df["global_mae"], mode="lines+markers", name="Federated Global MAE", line=dict(color="#10b981", width=3)))
        fig_mae.add_hline(y=st.session_state.centralized_metrics["mae"], line_dash="dash", line_color="#ef4444", annotation_text="Centralized Baseline MAE")
        fig_mae.update_layout(title="Real-Time MAE Convergence Across Rounds", xaxis_title="Round", yaxis_title="MAE (Vehicles/Hour)", template="plotly_white")
        rt_chart_mae.plotly_chart(fig_mae, use_container_width=True)

        fig_rmse = go.Figure()
        fig_rmse.add_trace(go.Scatter(x=h_df["round"], y=h_df["global_rmse"], mode="lines+markers", name="Federated Global RMSE", line=dict(color="#3b82f6", width=3)))
        fig_rmse.add_hline(y=st.session_state.centralized_metrics["rmse"], line_dash="dash", line_color="#dc2626", annotation_text="Centralized Baseline RMSE")
        fig_rmse.update_layout(title="Real-Time RMSE Convergence Across Rounds", xaxis_title="Round", yaxis_title="RMSE (Vehicles/Hour)", template="plotly_white")
        rt_chart_rmse.plotly_chart(fig_rmse, use_container_width=True)

    st.markdown("### Head-to-Head Comparison: Centralized vs Federated")
    fl_final_mae = st.session_state.fl_training_history[-1]["global_mae"] if st.session_state.fl_training_history else "N/A"
    fl_final_rmse = st.session_state.fl_training_history[-1]["global_rmse"] if st.session_state.fl_training_history else "N/A"
    fl_comm_kb = f"{st.session_state.fl_coordinator.comm_tracker.get_total_kb():.1f} KB"
    raw_comm_kb = f"{st.session_state.raw_data_bytes / 1024:.1f} KB"

    comp_df = pd.DataFrame([
        {
            "Metric": "Data Sharing Approach",
            "Centralized ML Baseline": "All raw traffic CSV data sent to server",
            "Federated ML (SmartFlow FL)": "Zero raw data shared; local weights only"
        },
        {
            "Metric": "Mean Absolute Error (MAE)",
            "Centralized ML Baseline": f"{st.session_state.centralized_metrics['mae']:.3f}",
            "Federated ML (SmartFlow FL)": f"{fl_final_mae}"
        },
        {
            "Metric": "Root Mean Squared Error (RMSE)",
            "Centralized ML Baseline": f"{st.session_state.centralized_metrics['rmse']:.3f}",
            "Federated ML (SmartFlow FL)": f"{fl_final_rmse}"
        },
        {
            "Metric": "Training Rounds",
            "Centralized ML Baseline": "1 (Batch)",
            "Federated ML (SmartFlow FL)": f"{st.session_state.fl_trained_rounds} Rounds"
        },
        {
            "Metric": "Communication Cost",
            "Centralized ML Baseline": f"{raw_comm_kb} (One-time raw upload)",
            "Federated ML (SmartFlow FL)": f"{fl_comm_kb} (Iterative parameter exchange)"
        },
        {
            "Metric": "Privacy Guarantee",
            "Centralized ML Baseline": "None (Full sensor logs centralized)",
            "Federated ML (SmartFlow FL)": "High (Local data remains at junction)"
        }
    ])
    st.table(comp_df)

    st.info(
        "Important Communication Note: Federated learning does not inherently guarantee lower network cost "
        "than raw centralized sharing over large numbers of rounds. Its primary breakthrough is preserving "
        "sovereign raw sensor privacy, and SmartFlow FL allows operators to experimentally evaluate this exact trade-off."
    )

# ----------------- SECTION 6: ABOUT THE PROJECT -----------------
elif section == "6. About the Project":
    st.title("About SmartFlow FL")
    st.subheader("PS-003: Federated Traffic-Flow Prediction with Communication-Cost Evaluation")

    st.markdown("""
    ### 1. Problem Statement
    Modern municipal transportation departments deploy intelligent sensor loops across traffic junctions.
    Centralizing this voluminous raw vehicular telemetry creates major privacy vulnerabilities, bandwidth congestion,
    and single points of failure.

    ### 2. Proposed Solution
    **SmartFlow FL** deploys Federated Averaging (FedAvg) across decentralized edge junctions. Each simulated junction
    trains a local prediction model on its isolated sensor telemetry and transmits only lightweight mathematical parameter
    weights to a central coordinator.

    ### 3. Key Findings & Communication Cost Analysis
    - **Privacy:** Raw vehicle counts, speeds, and timestamps stay strictly local.
    - **Overhead:** Weight transfers require deterministic payload sizes (~1.2 KB per round per client), making
      communication cost predictable and measurable.
    """)

    st.markdown("---")
    st.success(
        "SmartFlow FL demonstrates how distributed traffic locations can collaboratively improve "
        "traffic-flow prediction while keeping local datasets at their respective clients and explicitly "
        "measuring the communication required for federated training."
    )
