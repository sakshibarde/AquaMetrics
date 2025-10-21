import pandas as pd
import numpy as np
import os
from sklearn.ensemble import IsolationForest
import matplotlib.pyplot as plt
import sqlite3
from datetime import datetime

# ---------- CONFIG ----------
DB_PATH = "backend/data/water_quality.db"
ANOMALY_SAVE_DIR = "backend/static/anomaly/"

os.makedirs(ANOMALY_SAVE_DIR, exist_ok=True)

def load_data():
    """Load latest data from SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT * FROM water_quality", conn)
    conn.close()
    return df

def detect_anomalies(df, features):
    """Detect anomalies using Isolation Forest"""
    model = IsolationForest(
        n_estimators=100,
        contamination=0.05,   # Adjust threshold for sensitivity
        random_state=42
    )
    df_valid = df.dropna(subset=features).copy()
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
    df.to_sql("anomaly_results", conn, if_exists="replace", index=False)
    conn.close()

def run_anomaly_detection():
    """Main function to run anomaly detection pipeline"""
    print("🔍 Running anomaly detection...")
    df = load_data()

    # Choose numeric columns for anomaly detection
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if len(numeric_cols) < 2:
        print("⚠️ Not enough numeric columns for anomaly detection.")
        return

    df_result = detect_anomalies(df, numeric_cols)
    save_results(df_result)

    # Generate few example anomaly plots automatically
    plot_paths = []
    for i in range(min(2, len(numeric_cols)-1)):
        path = plot_anomalies(df_result, numeric_cols[i], numeric_cols[i+1])
        plot_paths.append(path)

    print(f"✅ Anomaly detection complete. Plots saved in {ANOMALY_SAVE_DIR}")
    return plot_paths


if __name__ == "__main__":
    run_anomaly_detection()
