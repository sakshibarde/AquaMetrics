# step8lstmusingdailt.py
import pandas as pd
import numpy as np
import sqlite3
import plotly.graph_objects as go
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import json
import os
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")

def create_daily_prediction_plots(db_path, output_json_dir):
    """
    Trains LSTM per station, predicts for the NEXT day, and saves
    Plotly bar charts as JSON files (one per station).
    
    Parameters:
    db_path (str): Path to the my_database.db file.
    output_json_dir (str): Path to save the plot files
                             (e.g., 'static_plots/daily/')
    """
    print("Starting daily prediction batch job...")
    os.makedirs(output_json_dir, exist_ok=True) # Create dir
    
    # --- 1. Load data ---
    con = sqlite3.connect(db_path)
    try:
        df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
    finally:
        con.close()
        
    df.columns = df.columns.str.strip()
    df['date'] = pd.to_datetime(df['timestampDate']).dt.date
    df = df.dropna(subset=['stationId'])
    
    all_params = [
        'Biochemical Oxygen Demand', 'Chemical Oxygen Demand', 'Chloride', 'Conductivity',
        'Depth', 'Dissolved Oxygen', 'Nitrate', 'Total Organic Carbon', 'Water Level',
        'Water Temperature', 'Water Turbidity', 'pH'
    ]
    parameter_cols = [p for p in all_params if p in df.columns]
    stations = df['stationId'].unique()
    seq_length = 7 # Use 7 days to predict the 8th
    epochs = 20

    def create_sequences(data, seq_length):
        xs, ys = [], []
        for i in range(len(data) - seq_length):
            xs.append(data[i:(i + seq_length)])
            ys.append(data[i + seq_length])
        return np.array(xs), np.array(ys)

    # --- 2. Loop through stations, train, and predict ---
    for station_id in stations:
        print(f"Processing station: {station_id}...")
        station_df = df[df['stationId'] == station_id].sort_values('date')
        daily_avg = station_df.groupby('date')[parameter_cols].mean().reset_index()
        
        if len(daily_avg) < seq_length + 1: # Need at least 8 days
            print(f"Skipping {station_id}: not enough data.")
            continue
            
        scaler = MinMaxScaler()
        data_scaled = scaler.fit_transform(daily_avg[parameter_cols])
        
        # Use the *last* sequence to make a *future* prediction
        last_sequence = data_scaled[-seq_length:]
        X_pred = np.array([last_sequence]) # Reshape for model
        
        # Train on all available data
        X_train, y_train = create_sequences(data_scaled, seq_length)
        
        if X_train.shape[0] < 2:
            print(f"Skipping {station_id}: not enough sequences to train.")
            continue
            
        # Define and train model
        model = Sequential([
            LSTM(50, activation='relu', input_shape=(seq_length, len(parameter_cols))),
            Dense(len(parameter_cols))
        ])
        model.compile(optimizer='adam', loss='mse')
        model.fit(X_train, y_train, epochs=epochs, batch_size=1, verbose=0)
        
        # Predict and inverse-transform
        future_pred = model.predict(X_pred, verbose=0)
        future_pred_inv = scaler.inverse_transform(future_pred)
        
        # Get actual data for *today* (the last day in the dataset)
        actual_today_inv = daily_avg[parameter_cols].values[-1]
        
        prediction_date = daily_avg['date'].max() + timedelta(days=1)
        
        # --- 3. Create Plotly JSON plot ---
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=parameter_cols,
            y=actual_today_inv,
            name=f'Actual (Today)',
            marker_color='blue'
        ))
        fig.add_trace(go.Bar(
            x=parameter_cols,
            y=future_pred_inv[0],
            name=f'Predicted (Tomorrow)',
            marker_color='orange'
        ))
        
        fig.update_layout(
            title=f"Station {station_id} - Daily Prediction for {prediction_date.strftime('%Y-%m-%d')}",
            barmode='group',
            xaxis_tickangle=-45
        )
        
        # --- 4. Save plot to JSON file ---
        # Use a consistent name so the API can find it
        output_path = os.path.join(output_json_dir, f"daily_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved plot for {station_id} to {output_path}")

    print("Daily prediction batch job complete.")

# --- This makes the file runnable as a batch job ---
if __name__ == "__main__":
    # To run this, type in your terminal:
    # python step8lstmusingdailt.py
    create_daily_prediction_plots(
        db_path='my_database.db',
        output_json_dir='static_plots/daily' # Your API will read from this folder
    )