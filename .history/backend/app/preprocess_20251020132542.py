import pandas as pd

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
