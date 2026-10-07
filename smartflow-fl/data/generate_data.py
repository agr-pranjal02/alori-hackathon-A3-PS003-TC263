"""
SmartFlow FL - Data Generation Module
Generates realistic synthetic traffic flow datasets for simulated smart-city junctions.
Each record contains: timestamp, junction_id, vehicle_count, average_speed, occupancy, hour, day_of_week
"""

import os
import math
import random
import datetime
import pandas as pd
import numpy as np

# Junction profiles with specific diurnal characteristics
JUNCTIONS = {
    "Junction A": {
        "name": "Downtown Central Hub",
        "base_flow": 120,
        "morning_peak_hour": 8.5,
        "evening_peak_hour": 17.5,
        "peak_intensity": 180,
        "speed_base": 42.0,
        "speed_drop_factor": 0.12,
        "occupancy_factor": 0.0035,
        "noise_scale": 15,
    },
    "Junction B": {
        "name": "Highway North Arterial",
        "base_flow": 160,
        "morning_peak_hour": 8.0,
        "evening_peak_hour": 18.0,
        "peak_intensity": 220,
        "speed_base": 78.0,
        "speed_drop_factor": 0.18,
        "occupancy_factor": 0.0028,
        "noise_scale": 20,
    },
    "Junction C": {
        "name": "Commercial District Ring",
        "base_flow": 90,
        "morning_peak_hour": 11.5,
        "evening_peak_hour": 16.5,
        "peak_intensity": 140,
        "speed_base": 35.0,
        "speed_drop_factor": 0.10,
        "occupancy_factor": 0.0040,
        "noise_scale": 12,
    },
    "Junction D": {
        "name": "Residential Sector Gate",
        "base_flow": 60,
        "morning_peak_hour": 7.5,
        "evening_peak_hour": 19.0,
        "peak_intensity": 110,
        "speed_base": 45.0,
        "speed_drop_factor": 0.11,
        "occupancy_factor": 0.0032,
        "noise_scale": 10,
    },
}

def gaussian_peak(hour: float, peak_hour: float, width: float = 1.8) -> float:
    """Calculate normalized gaussian peak intensity for traffic rush hours."""
    return math.exp(-((hour - peak_hour) ** 2) / (2 * (width ** 2)))

def generate_junction_data(
    junction_id: str,
    days: int = 14,
    start_date: datetime.datetime = None,
    seed: int = 42
) -> pd.DataFrame:
    """
    Generate realistic synthetic traffic data for a single junction.
    
    Parameters:
        junction_id: Key matching JUNCTIONS (e.g., 'Junction A')
        days: Number of days of historical traffic data
        start_date: Starting datetime
        seed: Random seed for reproducibility
    """
    if seed is not None:
        np.random.seed(seed)
        random.seed(seed)
        
    if start_date is None:
        start_date = datetime.datetime.now() - datetime.timedelta(days=days)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
    config = JUNCTIONS.get(junction_id, JUNCTIONS["Junction A"])
    records = []
    
    total_hours = days * 24
    for i in range(total_hours):
        current_time = start_date + datetime.timedelta(hours=i)
        hour = current_time.hour
        day_of_week = current_time.weekday()  # 0=Monday, 6=Sunday
        is_weekend = day_of_week >= 5
        
        # Rush hour curves
        m_peak = gaussian_peak(hour, config["morning_peak_hour"], width=1.6)
        e_peak = gaussian_peak(hour, config["evening_peak_hour"], width=2.0)
        night_dip = 0.25 if (hour >= 23 or hour <= 5) else 1.0
        
        # Weekend adjustment (flatter profile, shifted to midday)
        if is_weekend:
            m_peak *= 0.4
            e_peak *= 0.6
            weekend_midday = gaussian_peak(hour, 14.0, width=3.0) * 0.7
            flow_mult = 0.75 + weekend_midday
        else:
            flow_mult = 1.0 + (m_peak + e_peak)
            
        expected_flow = config["base_flow"] * night_dip * flow_mult
        noise = np.random.normal(0, config["noise_scale"])
        vehicle_count = max(5, int(round(expected_flow + noise)))
        
        # Average speed decreases with vehicle count (fundamental traffic flow diagram)
        speed = max(10.0, config["speed_base"] - (vehicle_count * config["speed_drop_factor"]) + np.random.normal(0, 2.5))
        
        # Occupancy increases with vehicle count (percentage 0.0 to 1.0)
        occupancy = min(0.98, max(0.02, vehicle_count * config["occupancy_factor"] + np.random.normal(0, 0.015)))
        
        records.append({
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
            "junction_id": junction_id,
            "vehicle_count": vehicle_count,
            "average_speed": round(speed, 2),
            "occupancy": round(occupancy, 4),
            "hour": hour,
            "day_of_week": day_of_week,
        })
        
    df = pd.DataFrame(records)
    # Add previous time period vehicle count (lag feature)
    df["prev_vehicle_count"] = df["vehicle_count"].shift(1).fillna(df["vehicle_count"].mean()).astype(int)
    return df

def generate_all_traffic_data(days: int = 14, seed: int = 42) -> pd.DataFrame:
    """Generate combined synthetic traffic data across all four junctions."""
    dfs = []
    for idx, j_id in enumerate(JUNCTIONS.keys()):
        df = generate_junction_data(j_id, days=days, seed=seed + idx * 100)
        dfs.append(df)
    combined = pd.concat(dfs, ignore_index=True)
    return combined

if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.abspath(__file__))
    combined_df = generate_all_traffic_data(days=14)
    csv_path = os.path.join(output_dir, "traffic_dataset.csv")
    combined_df.to_csv(csv_path, index=False)
    print(f"Generated {len(combined_df)} records across {len(JUNCTIONS)} junctions -> {csv_path}")
