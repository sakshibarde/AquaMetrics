# models/correlation_analysis.py
import pandas as pd
import sqlite3
import plotly.graph_objects as go
import numpy as np
import json
import os
import warnings

# --- Build Absolute Paths ---
MODELS_PY_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(MODELS_PY_DIR)
# --- END NEW ---

# --- CONFIGURATION (Using Absolute Paths) ---
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
TABLE_NAME = "water_records"
OUTPUT_DIR = os.path.join(BACKEND_DIR, "static/correlation")
CORRELATION_METHODS = ['pearson', 'spearman', 'kendall']
TOP_N_PAIRS = 5

def run_correlation_analysis():
    """
    Generates Pearson, Spearman, and Kendall correlation heatmaps for each station,
    finds top correlated pairs, and saves them as Plotly JSON files.
    """
    print("--- Starting Correlation Analysis Batch Job ---")
    # Ensure directories exist BEFORE trying to use them
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    conn = None # Initialize conn
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(f"SELECT * FROM {TABLE_NAME}", con)
    except Exception as e:
        print(f"🔴 ERROR: Could not read from database. {e}")
        return # Exit if data can't be read
    finally:
        if conn: # Only close if connection was successful
            conn.close()

    exclude_cols = ['stationId', 'timestamp', 'timestampDate']
    params = [c for c in df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]
    stations = df['stationId'].unique()

    for station in stations:
        station_data = df[df['stationId'] == station][params].dropna()

        if len(station_data) < 5:
            print(f"   ⏭️ Skipping station {station}: not enough data ({len(station_data)} rows).")
            continue

        for method in CORRELATION_METHODS:
            print(f"   Processing Station {station} ({method})...")
            try:
                corr_matrix = station_data.corr(method=method)

                # --- (NEW) Find Top Correlated Pairs ---
                upper_triangle = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
                correlated_pairs_series = upper_triangle.stack().dropna()
                if not correlated_pairs_series.empty:
                    correlated_pairs_df = correlated_pairs_series.reset_index()
                    correlated_pairs_df.columns = ['param1', 'param2', 'correlation']
                    correlated_pairs_df['abs_corr'] = correlated_pairs_df['correlation'].abs()
                    correlated_pairs_df = correlated_pairs_df.sort_values(by='abs_corr', ascending=False)

                    top_positive = correlated_pairs_df[correlated_pairs_df['correlation'] > 0].head(TOP_N_PAIRS).to_dict('records')
                    top_negative = correlated_pairs_df[correlated_pairs_df['correlation'] < 0].head(TOP_N_PAIRS).to_dict('records')
                    top_pairs = {'positive': top_positive, 'negative': top_negative}
                else:
                    top_pairs = {'positive': [], 'negative': []}
                # --- (END NEW) ---


                # Create Plotly Heatmap
                fig = go.Figure(data=go.Heatmap(
                    z=corr_matrix.values,
                    x=corr_matrix.columns,
                    y=corr_matrix.index,
                    colorscale='RdBu',
                    zmin=-1,
                    zmax=1,
                    text=corr_matrix.values,
                    texttemplate="%{text:.2f}"
                ))

                fig.update_layout(
                    title=f"Correlation Matrix ({method.capitalize()}) - Station {station}",
                    xaxis_tickangle=-45,
                    height=700,
                    width=800,
                    meta={'top_correlated_pairs': top_pairs}
                )

                # Save plot to JSON file
                output_path = os.path.join(OUTPUT_DIR, f"correlation_station_{station}_{method}.json")
                fig.write_json(output_path)
                print(f"   ✅ Saved {method} plot for {station}")

            except Exception as e:
                print(f"   🔴 ERROR calculating {method} correlation for station {station}: {e}")


    print("--- Correlation Analysis Batch Job Complete ---")

if __name__ == "__main__":
    run_correlation_analysis()