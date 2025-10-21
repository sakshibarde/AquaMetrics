# models/predictions.py
import pandas as pd
import numpy as np
import sqlite3
import plotly.graph_objects as go
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import load_model
import joblib
import json
import os
import warnings
from datetime import datetime, timedelta

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=UserWarning, module='tensorflow')

# --- CONFIGURATION ---
DAILY_MODEL_DIR = "model_store/lstm_daily"
WEEKLY_MODEL_DIR = "model_store/lstm_weekly" # For when you add this
DB_PATH = "database/water_quality.db"
SEQ_LENGTH = 10 # Must match your Colab script!

# --- Load Daily Model Files ---
try:
    with open(os.path.join(DAILY_MODEL_DIR, "daily_features.json"), 'r') as f:
        DAILY_FEATURES = json.load(f)
    print("✅ Daily features loaded.")
except Exception as e:
    print(f"🔴 ERROR: Could not load 'model_store/lstm_daily/daily_features.json'. Error: {e}")
    DAILY_FEATURES = []

def create_daily_prediction_plots(output_json_dir="static/predictions/daily"):
    """
    LOADS pre-trained models, runs prediction on latest DB data,
    and saves Plotly JSON graphs.
    """
    print("--- Starting Daily Prediction Batch Job ---")
    os.makedirs(output_json_dir, exist_ok=True)
    
    if not DAILY_FEATURES:
        print("🔴 Cannot run daily predictions: feature list not loaded.")
        return

    # 1. Load data from DB
    con = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
    finally:
        con.close()
        
    df['date'] = pd.to_datetime(df['timestampDate']).dt.date
    stations = df['stationId'].unique()

    # 2. Loop through stations, LOAD model, and PREDICT
    for station_id in stations:
        # --- Load model files for this specific station ---
        model_path = os.path.join(DAILY_MODEL_DIR, f"daily_model_station_{station_id}.h5")
        scaler_path = os.path.join(DAILY_MODEL_DIR, f"daily_scaler_station_{station_id}.pkl")
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print(f"⏭️ Skipping {station_id}: model or scaler file not found.")
            continue
            
        try:
            model = load_model(model_path, compile=False)
            scaler = joblib.load(scaler_path)
        except Exception as e:
            print(f"🔴 ERROR loading model for {station_id}: {e}")
            continue

        # --- Get latest data for this station ---
        station_df = df[df['stationId'] == station_id].sort_values('date')
        daily_avg = station_df.groupby('date')[DAILY_FEATURES].mean().dropna()

        if len(daily_avg) < SEQ_LENGTH:
            print(f"⏭️ Skipping {station_id}: not enough data in DB ({len(daily_avg)} days).")
            continue
            
        # --- Prepare the LAST sequence from the database ---
        last_sequence_df = daily_avg.iloc[-SEQ_LENGTH:]
        
        # Use the LOADED scaler to transform the new data
        last_sequence_scaled = scaler.transform(last_sequence_df)
        X_pred = np.array([last_sequence_scaled]) # Reshape for model

        # 3. Predict and inverse-transform
        with warnings.catch_warnings():
             warnings.simplefilter("ignore") # Suppress prediction warnings
             future_pred_scaled = model.predict(X_pred)
             
        future_pred_inv = scaler.inverse_transform(future_pred_scaled)
        
        # Get actual data for *today*
        actual_today_inv = daily_avg[DAILY_FEATURES].values[-1]
        
        prediction_date = daily_avg['date'].max() + timedelta(days=1)
        
        # 4. Create Plotly JSON plot
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=DAILY_FEATURES,
            y=actual_today_inv,
            name=f'Actual (Today)',
            marker_color='blue'
        ))
        fig.add_trace(go.Bar(
            x=DAILY_FEATURES,
            y=future_pred_inv[0],
            name=f'Predicted (Tomorrow)',
            marker_color='orange'
        ))
        
        fig.update_layout(
            title=f"Station {station_id} - Daily Prediction for {prediction_date.strftime('%Y-%m-%d')}",
            barmode='group',
            xaxis_tickangle=-45
        )
        
        # 5. Save plot to JSON file
        output_path = os.path.join(output_json_dir, f"daily_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved plot for {station_id}")

    print("--- Daily Prediction Batch Job Complete ---")


def create_weekly_prediction_plots(output_json_dir="static/predictions/weekly"):
    """
    (TODO) You will build this function just like the daily one, but:
    1. Load 'weekly_features.json'
    2. Load 'weekly_model_station_...' and 'weekly_scaler_station_...'
    3. Resample the data to 'W' (weekly)
    4. Get the last (weekly) sequence and predict
    5. Save the plot to the 'output_json_dir'
    """
    print("--- Weekly Prediction Job (Not Implemented) ---")
    pass

# --- This makes the file runnable as a batch job ---
if __name__ == "__main__":
    # To run this, type in your terminal:
    # python models/predictions.py
    create_daily_prediction_plots()
    create_weekly_prediction_plots()