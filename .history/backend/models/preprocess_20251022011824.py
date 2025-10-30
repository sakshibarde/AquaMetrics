# models/preprocess.py
import pandas as pd
import sqlite3
from sklearn.preprocessing import StandardScaler
import os


DB_PATH = "database/water_quality.db" # Corrected Path
TABLE_NAME = "water_records"         # Corrected Table Name

def organize_records(df: pd.DataFrame):
    # Pivot: stationId + timestamp + timestampDate → columns = parameterName
    pivot_df = df.pivot_table(
        index=['stationId', 'timestamp', 'timestampDate'],
        columns='parameterName',
        values='value',
        aggfunc='first'
    ).reset_index()

    # Drop malfunctioning station IDs
    ids_to_drop = [11791, 11792, 11810]
    pivot_df = pivot_df[~pivot_df['stationId'].isin(ids_to_drop)]
    return pivot_df

def clean_and_fill(df_new: pd.DataFrame):
    conn = sqlite3.connect(DB_PATH)

    # --- 1. Load historical data (for mean reference) ---
    try:
        df_hist = pd.read_sql(f"SELECT * FROM {TABLE_NAME}", conn)
    except Exception as e:
        print(f"Warning: Could not load historical data for mean calc. {e}")
        df_hist = pd.DataFrame()
    finally:
        conn.close()

    # --- 2. Drop too-incomplete rows in new data ---
    df_new = df_new[df_new.isnull().sum(axis=1) <= 3].copy()
    
    numeric_cols = df_new.select_dtypes(include=['number']).columns

    # --- 3. Combine historical + new (only for computing means) ---
    if not df_hist.empty:
        hist_numeric_cols = df_hist.select_dtypes(include=['number']).columns
        # Ensure we only use common columns
        common_cols = list(set(numeric_cols) & set(hist_numeric_cols))
        combined = pd.concat([df_hist[common_cols], df_new[common_cols]], ignore_index=True)
        col_means = combined.mean()
    else:
        col_means = df_new[numeric_cols].mean()

    # --- 4. Fill missing numeric values in the new batch ---
    df_new[numeric_cols] = df_new[numeric_cols].fillna(col_means)

    # Note: Standardization is removed here.
    # Each model (classification, LSTM) should handle its own scaling
    # by loading its own specific scaler.
    return df_new