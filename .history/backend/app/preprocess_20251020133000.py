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


def clean_and_standardize(df: pd.DataFrame):
    # 1. Drop rows with > 3 nulls
    df = df[df.isnull().sum(axis=1) <= 3].copy()

    # 2. Separate invalid stations (for logging only)
    condition = df[['Water Level', 'Depth', 'Chloride']].isnull().all(axis=1)
    df_valid = df[~condition].copy()

    # 3. Fill missing numeric values with mean
    numeric_cols = df_valid.select_dtypes(include=['number']).columns
    df_valid[numeric_cols] = df_valid[numeric_cols].fillna(df_valid[numeric_cols].mean())

    # # 4. Standardize numeric columns
    # scaler = StandardScaler()
    # df_valid[numeric_cols] = scaler.fit_transform(df_valid[numeric_cols])

    return df_valid