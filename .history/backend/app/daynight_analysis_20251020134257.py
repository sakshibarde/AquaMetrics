def run_day_night_analysis(db_path="database/water_quality.db"):
    import pandas as pd, matplotlib.pyplot as plt, os, math
    from sklearn.preprocessing import StandardScaler
    os.makedirs("static/daynight", exist_ok=True)

    conn = sqlite3.connect(db_path)
    df = pd.read_sql("SELECT * FROM readings", conn)
    conn.close()

    df['timestampDate'] = pd.to_datetime(df['timestampDate'])
    df['hour'] = df['timestampDate'].dt.hour
    df['date'] = df['timestampDate'].dt.date
    df['period'] = df['hour'].apply(lambda h: 'Day' if 6 <= h < 18 else 'Night')

    exclude = ['timestamp', 'timestampDate', 'hour', 'date', 'period', 'stationId']
    params = [c for c in df.columns if c not in exclude]

    for sid in df['stationId'].unique():
        sdata = df[df['stationId'] == sid]
        scaler = StandardScaler()
        sdata[params] = scaler.fit_transform(sdata[params])

        valid_dates = sdata.groupby('date')['period'].nunique()
        valid_dates = valid_dates[valid_dates == 2].index
        sdata = sdata[sdata['date'].isin(valid_dates)]

        if sdata.empty: continue

        rows, cols = math.ceil(len(params) / 3), 3
        fig, axes = plt.subplots(rows, cols, figsize=(15, 4*rows), sharex=True)
        axes = axes.flatten()

        for i, p in enumerate(params):
            ax = axes[i]
            grouped = sdata.groupby(['date', 'period'])[p].mean().unstack()
            if 'Day' in grouped: ax.plot(grouped.index, grouped['Day'], color='orange', label='Day')
            if 'Night' in grouped: ax.plot(grouped.index, grouped['Night'], color='blue', label='Night')
            ax.set_title(p, fontsize=8); ax.legend(fontsize=6)
        plt.tight_layout()
        plt.savefig(f"static/daynight/station_{sid}.png", dpi=150)
        plt.close()
