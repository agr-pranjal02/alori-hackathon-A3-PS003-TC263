"""
SmartFlow FL - Federated Learning Module
Implements Federated Averaging (FedAvg) orchestration for simulated smart-city traffic junctions.
Maintains data privacy: only parameter updates are communicated between clients and the central server.
"""

import copy
import numpy as np
import pandas as pd
from typing import Dict, List, Callable, Optional

from models.traffic_model import LocalTrafficModel, FEATURE_COLS, TARGET_COL
from utils.metrics import evaluate_model
from utils.communication import estimate_model_payload_size, CommunicationTracker

class SimulatedTrafficClient:
    """
    Simulated Client representing a single traffic junction (e.g., Junction A).
    Maintains its local private dataset and trains local model parameters.
    """
    def __init__(self, junction_id: str, local_df: pd.DataFrame):
        self.junction_id = junction_id
        # Split local dataset 80% train, 20% test
        split_idx = int(len(local_df) * 0.8)
        self.train_df = local_df.iloc[:split_idx].copy()
        self.test_df = local_df.iloc[split_idx:].copy()
        self.model = LocalTrafficModel()
        self.sample_count = len(self.train_df)
        
    def train_local_epoch(self, initial_weights: Optional[dict] = None) -> dict:
        """
        Train local model on local private data.
        If initial_weights are provided, initialize with current global model weights.
        Returns extracted parameter dictionary (no raw data shared).
        """
        X_train = self.train_df[FEATURE_COLS]
        y_train = self.train_df[TARGET_COL]
        
        if initial_weights is not None:
            # Load global parameters before training
            self.model.set_parameters(initial_weights)
            
        self.model.fit(X_train, y_train)
        return self.model.get_parameters()
        
    def evaluate(self, custom_weights: Optional[dict] = None) -> dict:
        """Evaluate performance on client's local held-out test data."""
        if custom_weights is not None:
            eval_model = LocalTrafficModel()
            eval_model.set_parameters(custom_weights)
            preds = eval_model.predict(self.test_df[FEATURE_COLS])
        else:
            preds = self.model.predict(self.test_df[FEATURE_COLS])
            
        return evaluate_model(self.test_df[TARGET_COL], preds)


class FedAvgCoordinator:
    """
    Central Federated Server orchestrating FedAvg (Federated Averaging).
    1. Distributes current global parameters to active clients.
    2. Collects local parameter updates from each client.
    3. Aggregates updates weighted by local sample count: W_global = sum( (n_k / N) * W_k )
    4. Evaluates round metrics and tracks communication cost.
    """
    def __init__(self, clients: List[SimulatedTrafficClient], global_test_df: pd.DataFrame):
        self.clients = {c.junction_id: c for c in clients}
        self.global_test_df = global_test_df
        self.global_weights: Optional[dict] = None
        self.comm_tracker = CommunicationTracker()
        self.history: List[dict] = []
        
    def aggregate_parameters(self, client_updates: List[tuple]) -> dict:
        """
        Weighted Federated Averaging:
        client_updates: list of (client_id, sample_count, weights_dict)
        """
        total_samples = sum(item[1] for item in client_updates)
        first_weights = client_updates[0][2]
        
        new_coef = np.zeros_like(first_weights["coef"])
        new_intercept = 0.0
        new_scaler_mean = np.zeros_like(first_weights["scaler_mean"])
        new_scaler_scale = np.zeros_like(first_weights["scaler_scale"])
        
        for _, sample_count, weights in client_updates:
            weight_factor = sample_count / total_samples
            new_coef += weight_factor * weights["coef"]
            new_intercept += weight_factor * weights["intercept"]
            new_scaler_mean += weight_factor * weights["scaler_mean"]
            new_scaler_scale += weight_factor * weights["scaler_scale"]
            
        return {
            "coef": new_coef,
            "intercept": new_intercept,
            "scaler_mean": new_scaler_mean,
            "scaler_scale": new_scaler_scale,
        }
        
    def evaluate_global_model(self, weights: dict) -> dict:
        """Evaluate the aggregated global model on the global held-out test dataset."""
        eval_model = LocalTrafficModel()
        eval_model.set_parameters(weights)
        preds = eval_model.predict(self.global_test_df[FEATURE_COLS])
        return evaluate_model(self.global_test_df[TARGET_COL], preds)
        
    def run_training_round(
        self,
        round_num: int,
        active_junction_ids: Optional[List[str]] = None
    ) -> dict:
        """
        Execute a single federated training round with communication logging.
        """
        if active_junction_ids is None:
            active_clients = list(self.clients.values())
        else:
            active_clients = [self.clients[jid] for jid in active_junction_ids if jid in self.clients]
            
        client_count = len(active_clients)
        if client_count == 0:
            raise ValueError("No active clients available for federated round.")
            
        # Step 1: Server sends global model to clients (Download)
        if self.global_weights is not None:
            server_payload_bytes = estimate_model_payload_size(self.global_weights)
        else:
            # Initial round cold start: small initialization seed payload
            server_payload_bytes = 256
            
        # Step 2: Clients train locally & send updates (Upload)
        client_updates = []
        uploaded_bytes_list = []
        
        for client in active_clients:
            local_weights = client.train_local_epoch(self.global_weights)
            client_updates.append((client.junction_id, client.sample_count, local_weights))
            up_bytes = estimate_model_payload_size(local_weights)
            uploaded_bytes_list.append(up_bytes)
            
        avg_client_upload_bytes = int(np.mean(uploaded_bytes_list))
        
        # Step 3: Server aggregates updates using FedAvg
        self.global_weights = self.aggregate_parameters(client_updates)
        
        # Step 4: Measure communication cost
        comm_stats = self.comm_tracker.log_round(
            round_num=round_num,
            client_count=client_count,
            client_upload_bytes=avg_client_upload_bytes,
            server_download_bytes=server_payload_bytes
        )
        
        # Step 5: Evaluate global model
        global_metrics = self.evaluate_global_model(self.global_weights)
        
        # Step 6: Evaluate individual clients with global model
        client_metrics = {}
        for client in active_clients:
            client_metrics[client.junction_id] = client.evaluate(self.global_weights)
            
        round_result = {
            "round": round_num,
            "clients_count": client_count,
            "global_mae": global_metrics["mae"],
            "global_rmse": global_metrics["rmse"],
            "global_r2": global_metrics["r2"],
            "comm_round_total_kb": comm_stats["round_total_kb"],
            "comm_cumulative_kb": comm_stats["cumulative_kb"],
            "client_metrics": client_metrics,
            "comm_details": comm_stats,
        }
        self.history.append(round_result)
        return round_result

    def train(
        self,
        num_rounds: int,
        active_junction_ids: Optional[List[str]] = None,
        callback: Optional[Callable[[dict], None]] = None
    ) -> List[dict]:
        """
        Execute multi-round federated training with optional real-time callback per round.
        """
        results = []
        for r in range(1, num_rounds + 1):
            round_data = self.run_training_round(r, active_junction_ids)
            results.append(round_data)
            if callback is not None:
                callback(round_data)
        return results
