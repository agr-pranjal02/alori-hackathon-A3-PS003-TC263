"""
SmartFlow FL - Metrics Utility
Calculates regression error metrics (MAE, RMSE, MAPE, R2) for traffic flow models.
"""

import numpy as np

def calculate_mae(y_true, y_pred) -> float:
    """Mean Absolute Error"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return float(np.mean(np.abs(y_true - y_pred)))

def calculate_rmse(y_true, y_pred) -> float:
    """Root Mean Squared Error"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

def calculate_mape(y_true, y_pred) -> float:
    """Mean Absolute Percentage Error (excluding zero actuals)"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    mask = y_true > 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)

def calculate_r2(y_true, y_pred) -> float:
    """Coefficient of Determination (R2 Score)"""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    if ss_tot == 0:
        return 0.0
    return float(1.0 - (ss_res / ss_tot))

def evaluate_model(y_true, y_pred) -> dict:
    """Return comprehensive regression performance report dictionary."""
    return {
        "mae": round(calculate_mae(y_true, y_pred), 3),
        "rmse": round(calculate_rmse(y_true, y_pred), 3),
        "mape": round(calculate_mape(y_true, y_pred), 2),
        "r2": round(calculate_r2(y_true, y_pred), 4),
    }
