"""
SmartFlow FL - Traffic Model Module
Defines local regression models for traffic junctions and centralized baseline model.
Uses scikit-learn Ridge regression with StandardScaler for predictable, lightweight,
and mathematically exact parameter aggregation across federated clients.
Also supports RandomForestRegressor for centralized baseline comparison.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from utils.metrics import evaluate_model

# Standard features engineered for traffic flow prediction
FEATURE_COLS = [
    "hour",
    "day_of_week",
    "prev_vehicle_count",
    "average_speed",
    "occupancy"
]
TARGET_COL = "vehicle_count"

class LocalTrafficModel:
    """
    Local linear model for a single simulated traffic junction client.
    Allows extracting and setting explicit weights and bias for FedAvg.
    """
    def __init__(self, alpha: float = 1.0):
        self.alpha = alpha
        self.scaler = StandardScaler()
        self.model = Ridge(alpha=self.alpha, fit_intercept=True)
        self.is_fitted = False
        self.feature_names = FEATURE_COLS
        
    def fit(self, X: pd.DataFrame, y: pd.Series):
        """Fit model locally on junction's private dataset."""
        X_scaled = self.scaler.fit_transform(X[self.feature_names])
        self.model.fit(X_scaled, y)
        self.is_fitted = True
        return self
        
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Generate predictions using local or aggregated global weights."""
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet.")
        X_scaled = self.scaler.transform(X[self.feature_names])
        preds = self.model.predict(X_scaled)
        # Vehicle count cannot be negative
        return np.maximum(0, preds)
        
    def get_parameters(self) -> dict:
        """
        Extract model parameters (weights vector and bias) to be sent to federated server.
        Raw training data is never returned or transmitted.
        """
        if not self.is_fitted:
            raise ValueError("Cannot extract parameters from unfitted model.")
        return {
            "coef": self.model.coef_.copy(),
            "intercept": float(self.model.intercept_),
            "scaler_mean": self.scaler.mean_.copy(),
            "scaler_scale": self.scaler.scale_.copy()
        }
        
    def set_parameters(self, params: dict):
        """
        Load aggregated global parameters received from federated server.
        """
        self.model.coef_ = np.array(params["coef"]).copy()
        self.model.intercept_ = float(params["intercept"])
        self.scaler.mean_ = np.array(params["scaler_mean"]).copy()
        self.scaler.scale_ = np.array(params["scaler_scale"]).copy()
        self.is_fitted = True

class CentralizedBaselineModel:
    """
    Centralized baseline model trained on pooled data from all junctions.
    Represents traditional non-federated approach (requires full raw data transfer).
    """
    def __init__(self, model_type: str = "ridge"):
        self.model_type = model_type
        self.scaler = StandardScaler()
        if model_type == "rf":
            self.model = RandomForestRegressor(n_estimators=50, random_state=42, n_jobs=-1)
        else:
            self.model = Ridge(alpha=1.0)
        self.is_fitted = False
        self.feature_names = FEATURE_COLS
        
    def fit(self, X: pd.DataFrame, y: pd.Series):
        X_scaled = self.scaler.fit_transform(X[self.feature_names])
        self.model.fit(X_scaled, y)
        self.is_fitted = True
        return self
        
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Baseline model is not fitted yet.")
        X_scaled = self.scaler.transform(X[self.feature_names])
        preds = self.model.predict(X_scaled)
        return np.maximum(0, preds)
        
    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series) -> dict:
        preds = self.predict(X_test)
        return evaluate_model(y_test, preds)
