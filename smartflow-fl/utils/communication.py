"""
SmartFlow FL - Communication Cost Utility
Measures network payload sizes for Federated Learning updates vs Centralized data sharing.
"""

import pickle
import sys
import numpy as np
import pandas as pd

def estimate_model_payload_size(weights: dict) -> int:
    """
    Measure actual serialized byte size of model weights / parameter update dictionary.
    Includes coefficient weights and intercept bias.
    """
    try:
        serialized = pickle.dumps(weights)
        return len(serialized)
    except Exception:
        # Fallback calculation: float64 values (8 bytes each) + dict overhead
        num_floats = sum(
            np.prod(val.shape) if isinstance(val, np.ndarray) else 1 
            for val in weights.values()
        )
        return int(num_floats * 8 + 64)

def estimate_raw_data_size(df: pd.DataFrame) -> int:
    """
    Calculate the byte size if raw CSV/tabular records were transmitted across network
    to a centralized server (the baseline privacy-invasive approach).
    """
    # CSV string encoding size in bytes
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    return len(csv_bytes)

class CommunicationTracker:
    """
    Tracks and logs upload, download, round, and cumulative network communication costs.
    """
    def __init__(self):
        self.round_history = []
        self.cumulative_upload_bytes = 0
        self.cumulative_download_bytes = 0
        
    def log_round(
        self,
        round_num: int,
        client_count: int,
        client_upload_bytes: int,
        server_download_bytes: int
    ) -> dict:
        """
        Record communication exchange for one federated round.
        
        In FedAvg:
        - Each participating client uploads its trained local model delta to the server.
          Total Upload = client_upload_bytes * client_count
        - The server broadcasts the aggregated global model down to each client.
          Total Download = server_download_bytes * client_count
        """
        total_upload = client_upload_bytes * client_count
        total_download = server_download_bytes * client_count
        round_total = total_upload + total_download
        
        self.cumulative_upload_bytes += total_upload
        self.cumulative_download_bytes += total_download
        cumulative_total = self.cumulative_upload_bytes + self.cumulative_download_bytes
        
        entry = {
            "round": round_num,
            "clients": client_count,
            "upload_per_client_kb": round(client_upload_bytes / 1024, 2),
            "total_upload_kb": round(total_upload / 1024, 2),
            "download_per_client_kb": round(server_download_bytes / 1024, 2),
            "total_download_kb": round(total_download / 1024, 2),
            "round_total_kb": round(round_total / 1024, 2),
            "cumulative_kb": round(cumulative_total / 1024, 2),
            "cumulative_mb": round(cumulative_total / (1024 * 1024), 4),
        }
        self.round_history.append(entry)
        return entry
        
    def get_summary_dataframe(self) -> pd.DataFrame:
        """Return history as pandas DataFrame for tabular presentation and charting."""
        return pd.DataFrame(self.round_history)
        
    def get_total_kb(self) -> float:
        return (self.cumulative_upload_bytes + self.cumulative_download_bytes) / 1024.0
        
    def reset(self):
        self.round_history = []
        self.cumulative_upload_bytes = 0
        self.cumulative_download_bytes = 0
