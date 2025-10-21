# models/correlation_analysis.py
import pandas as pd
import sqlite3
import plotly.graph_objects as go
import json
import os
import warnings

# --- NEW: Build Absolute Paths ---
MODELS_PY_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(MODELS_PY_DIR)
# --- END NEW ---

# --- CONFIGURATION ---
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
TABLE_NAME = "water_records"
OUTPUT_DIR = os.path.join(BACKEND_DIR, "static/correlation")

def run_correlation_analysis():
    """
    Generates a Spearman correlation heatmap for each station
    and saves it as a Plotly JSON file.
    """
    print("--- Starting Correlation Analysis Batch Job ---")
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    try:
        con = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(f"SELECT * FROM {TABLE_NAME}", con)
    except Exception as e:
        print(f"🔴 ERROR: Could not read from database. {e}")
        return
    finally:
        con.close()

    # Get all numeric parameter columns
    exclude_cols = ['stationId', 'timestamp', 'timestampDate']
    params = [c for c in df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]
    
    stations = df['stationId'].unique()
    
    for station in stations:
        station_data = df[df['stationId'] == station][params].dropna()
        
        if len(station_data) < 2:
            print(f"   ⏭️ Skipping station {station}: not enough data.")
            continue
            
        # Use Spearman correlation: good for non-linear relationships
        corr_matrix = station_data.corr(method='spearman')
        
        # Create Plotly Heatmap
        fig = go.Figure(data=go.Heatmap(
            z=corr_matrix.values,
            x=corr_matrix.columns,
            y=corr_matrix.index,
            colorscale='RdBu', # Red-Blue scale
            zmin=-1, # Fix the scale from -1 to 1
            zmax=1,
            text=corr_matrix.values,
        texttemplate="%{text:.2f}"
        ))
        
        fig.update_layout(
            title=f"Correlation Matrix (Spearman) - Station {station}",
            xaxis_tickangle=-45,
            height=700,
            width=800
        )
        
        # Save plot to JSON file
        output_path = os.path.join(OUTPUT_DIR, f"correlation_station_{station}.json")
        fig.write_json(output_path)
        print(f"✅ Saved correlation plot for {station}")

    print("--- Correlation Analysis Batch Job Complete ---")

if __name__ == "__main__":
    run_correlation_analysis()