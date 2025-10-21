# step9lstmusingweekly.py
import pandas as pd
import numpy as np
import sqlite3
import plotly.graph_objects as go
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
import json
import os
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

def create_weekly_prediction_plots(db_path, output_json_dir):
    """
    Trains weekly LSTM per station, predicts for the NEXT week, and saves
    Plotly bar charts as JSON files (one per station).
    
    Parameters:
    db_path (str): Path to the my_database.db file.
    output_json_dir (str): Path to save the plot files
                             (e.g., 'static_plots/weekly/')
    """
    print("Starting weekly prediction batch job...")
    os.makedirs(output_json_dir, exist_ok=True) # Create dir
    
    # --- 1. Load and resample data ---
    con = sqlite3.connect(db_path)
    try:
        df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
    finally:
        con.close()
        
    df.columns = df.columns.str.strip()
    df = df.dropna(subset=['stationId'])
    
    all_params = [
        'Biochemical Oxygen Demand', 'Chemical Oxygen Demand', 'Chloride', 'Conductivity',
        'Depth', 'Dissolved Oxygen', 'Nitrate', 'Total Organic Carbon', 'Water Level',
        'Water Temperature', 'Water Turbidity', 'pH'
    ]
    parameter_cols = [p for p in all_params if p in df.columns]
    stations = df['stationId'].unique()
    seq_length = 7 # 7 weeks
    epochs = 30

    def create_weekly_sequences(data, seq_length):
        xs, ys = [], []
        for i in range(len(data) - seq_length):
            xs.append(data[i:(i + seq_length)])
            ys.append(data[i + seq_length])
        return np.array(xs), np.array(ys)

    # --- 2. Loop through stations, train, predict, and save plot ---
    for station_id in stations:
        print(f"Processing station: {station_id}...")
        station_df = df[df['stationId'] == station_id].sort_values('timestampDate')
        
        # Resample to weekly mean
        weekly_avg = station_df.set_index('timestampDate')[parameter_cols].resample('W').mean().reset_index()
        weekly_avg = weekly_avg.dropna()

        if len(weekly_avg) < seq_length + 1:
            print(f"Skipping {station_id}: not enough weekly data.")
            continue
            
        scaler = MinMaxScaler()
        data_scaled = scaler.fit_transform(weekly_avg[parameter_cols])
        
        # Use the *last* sequence to make a *future* prediction
        last_sequence = data_scaled[-seq_length:]
        X_pred = np.array([last_sequence]) # Reshape for model
        
        # Train on all available data
        X_train, y_train = create_weekly_sequences(data_scaled, seq_length)
        
        if X_train.shape[0] < 2:
            print(f"Skipping {station_id}: not enough weekly sequences to train.")
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
        
        # Get actual data for *this week*
        actual_this_week_inv = weekly_avg[parameter_cols].values[-1]
        
        this_week_date = weekly_avg['timestampDate'].max()
        
        # --- 3. Create Plotly JSON plot ---
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=parameter_cols,
            y=actual_this_week_inv,
            name=f'Actual (Week of {this_week_date.strftime("%Y-%m-%d")})',
            marker_color='blue'
        ))
        fig.add_trace(go.Bar(
            x=parameter_cols,
            y=future_pred_inv[0],
            name=f'Predicted (Next Week)',
            marker_color='orange'
        ))
        
        fig.update_layout(
            title=f"Station {station_id} - Weekly Prediction",
            barmode='group',
            xaxis_tickangle=-45
        )
        
        # --- 4. Save plot to JSON file ---
        output_path = os.path.join(output_json_dir, f"weekly_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved plot for {station_id} to {output_path}")

    print("Weekly prediction batch job complete.")

# --- This makes the file runnable as a batch job ---
if __name__ == "__main__":
    # To run this, type in your terminal:
    # python step9lstmusingweekly.py
    create_weekly_prediction_plots(
        db_path='my_database.db',
        output_json_dir='static_plots/weekly' # Your API will read from this folder
    )