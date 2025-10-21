import pandas as pd
from sklearn.preprocessing import StandardScaler

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

def clean_and_standardize(df_new: pd.DataFrame, db_path="data/water_quality.db"):
    conn = sqlite3.connect(db_path)

    # --- 1. Load historical data (for mean reference) ---
    try:
        df_hist = pd.read_sql("SELECT * FROM readings", conn)
        conn.close()
    except Exception:
        df_hist = pd.DataFrame()

    # --- 2. Drop too-incomplete rows in new data ---
    df_new = df_new[df_new.isnull().sum(axis=1) <= 3].copy()

    # --- 3. Combine historical + new (only for computing means) ---
    if not df_hist.empty:
        numeric_cols = df_hist.select_dtypes(include=['number']).columns
        combined = pd.concat([df_hist[numeric_cols], df_new[numeric_cols]], ignore_index=True)
        col_means = combined.mean()
    else:
        numeric_cols = df_new.select_dtypes(include=['number']).columns
        col_means = df_new[numeric_cols].mean()

    # --- 4. Fill missing numeric values in the new batch ---
    df_new[numeric_cols] = df_new[numeric_cols].fillna(col_means)

    # # --- 5. Standardize (fit on historical + new combined) ---
    # scaler = StandardScaler()
    # scaler.fit(pd.concat([df_hist[numeric_cols], df_new[numeric_cols]], ignore_index=True))
    # df_new[numeric_cols] = scaler.transform(df_new[numeric_cols])

    return df_new