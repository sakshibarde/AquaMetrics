# models/daynight_analysis.py
import pandas as pd
import matplotlib.pyplot as plt
import os
import math
import sqlite3
from sklearn.preprocessing import StandardScaler

# --- Build Absolute Paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
# --- END NEW ---

# --- CONFIGURATION (Using Absolute Paths) ---
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
TABLE_NAME = "water_records"
SAVE_DIR = os.path.join(BACKEND_DIR, "static/daynight")

def run_day_night_analysis():
    print("--- Starting Day/Night Analysis Batch Job ---")
    # Ensure directories exist BEFORE trying to use them
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(SAVE_DIR, exist_ok=True)

    conn = None # Initialize conn
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql(f"SELECT * FROM {TABLE_NAME}", conn)
    except Exception as e:
        print(f"🔴 ERROR: Could not read from database. {e}")
        return # Exit if data can't be read
    finally:
        if conn: # Only close if connection was successful
            conn.close()

    df['timestampDate'] = pd.to_datetime(df['timestampDate'], errors='coerce', format='mixed')
    df['hour'] = df['timestampDate'].dt.hour
    df['date'] = df['timestampDate'].dt.date
    df['period'] = df['hour'].apply(lambda h: 'Day' if 6 <= h < 18 else 'Night')

    exclude = ['timestamp', 'timestampDate', 'hour', 'date', 'period', 'stationId']
    params = [c for c in df.columns if c not in exclude and pd.api.types.is_numeric_dtype(df[c])]

    for sid in df['stationId'].unique():
        sdata = df[df['stationId'] == sid].copy()
        
        if sdata[params].empty:
            continue
            
        scaler = StandardScaler()
        # Handle potential empty params slice if all columns are excluded
        if not sdata[params].empty:
            sdata[params] = scaler.fit_transform(sdata[params])
        else:
            continue

        valid_dates = sdata.groupby('date')['period'].nunique()
        valid_dates = valid_dates[valid_dates == 2].index
        sdata = sdata[sdata['date'].isin(valid_dates)]

        if sdata.empty: 
            print(f"⏭️ Skipping {sid}: No complete day/night data.")
            continue

        rows, cols = math.ceil(len(params) / 3), 3
        fig, axes = plt.subplots(rows, cols, figsize=(15, 4*rows), sharex=True)
        
        # Ensure axes is always an array
        if rows == 1 and cols == 1:
            axes = [axes]
        else:
            axes = axes.flatten()

        for i, p in enumerate(params):
            ax = axes[i]
            grouped = sdata.groupby(['date', 'period'])[p].mean().unstack()
            if 'Day' in grouped: ax.plot(grouped.index, grouped['Day'], color='orange', label='Day')
            if 'Night' in grouped: ax.plot(grouped.index, grouped['Night'], color='blue', label='Night')
            ax.set_title(p, fontsize=8); ax.legend(fontsize=6)
        
        for j in range(len(params), len(axes)):
             axes[j].axis('off') # Hide unused subplots

        plt.tight_layout()
        save_path = os.path.join(SAVE_DIR, f"station_{sid}.png")
        plt.savefig(save_path, dpi=150)
        plt.close()
        print(f"✅ Saved Day/Night plot for station {sid}")
    print("--- Day/Night Analysis Complete ---")

if __name__ == "__main__":
    run_day_night_analysis()