# models/anomaly_detection.py
import pandas as pd
import numpy as np
import os
from sklearn.ensemble import IsolationForest
import matplotlib.pyplot as plt
import sqlite3
from datetime import datetime

# ---------- CONFIG ----------
DB_PATH = "database/water_quality.db"
TABLE_NAME = "water_records"
ANOMALY_TABLE = "anomaly_results"
ANOMALY_SAVE_DIR = "static/anomaly/"

def load_data():
    """Load latest data from SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql(f"SELECT * FROM {TABLE_NAME}", conn)
    except Exception as e:
        print(f"🔴 ERROR: Could not read from database. {e}")
        return pd.DataFrame()
    finally:
        conn.close()
    return df

def detect_anomalies(df, features):
    """Detect anomalies using Isolation Forest"""
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,  # Adjust threshold for sensitivity
        random_state=42
    )
    df_valid = df.dropna(subset=features).copy()
    if df_valid.empty:
        return pd.DataFrame()
        
    model.fit(df_valid[features])
    df_valid["anomaly"] = model.predict(df_valid[features])
    df_valid["anomaly"] = df_valid["anomaly"].map({1: "Normal", -1: "Anomaly"})
    return df_valid

def plot_anomalies(df, feature_x, feature_y):
    """Plot anomalies for two selected features"""
    plt.figure(figsize=(8, 6))
    for label, color in zip(["Normal", "Anomaly"], ["blue", "red"]):
        subset = df[df["anomaly"] == label]
        plt.scatter(subset[feature_x], subset[feature_y], label=label, alpha=0.6, c=color)
    
    plt.xlabel(feature_x)
    plt.ylabel(feature_y)
    plt.title(f"Anomaly Detection: {feature_x} vs {feature_y}")
    plt.legend()
    plt.grid(True)

    filename = f"anomaly_{feature_x}_{feature_y}_{datetime.now().strftime('%Y%m%d_%H%M')}.png"
    path = os.path.join(ANOMALY_SAVE_DIR, filename)
    plt.savefig(path, bbox_inches="tight")
    plt.close()
    return path

def save_results(df):
    """Save anomaly-tagged results back into database"""
    conn = sqlite3.connect(DB_PATH)
    df.to_sql(ANOMALY_TABLE, conn, if_exists="replace", index=False)
    conn.close()

def run_anomaly_detection():
    """Main function to run anomaly detection pipeline"""
    print("--- Starting Anomaly Detection Batch Job ---")
    os.makedirs(ANOMALY_SAVE_DIR, exist_ok=True)
    df = load_data()

    # Choose numeric columns for anomaly detection
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    # Exclude IDs or other non-parameter columns
    numeric_cols = [c for c in numeric_cols if c not in ['stationId', 'index']] 

    if len(numeric_cols) < 2:
        print("⚠️ Not enough numeric columns for anomaly detection.")
        return

    df_result = detect_anomalies(df, numeric_cols)
    if df_result.empty:
        print("⚠️ No valid data for anomaly detection.")
        return
        
    save_results(df_result)

    # Generate few example anomaly plots automatically
    plot_paths = []
    for i in range(min(2, len(numeric_cols)-1)): # Plot first vs second, second vs third
        path = plot_anomalies(df_result, numeric_cols[i], numeric_cols[i+1])
        plot_paths.append(path)
        print(f"✅ Saved anomaly plot: {path}")

    print(f"--- Anomaly detection complete. ---")
    return plot_paths