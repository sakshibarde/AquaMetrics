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

# --- NEW: Build Absolute Paths ---
# Get the absolute path to this script's directory (.../backend/models)
MODELS_PY_DIR = os.path.dirname(os.path.abspath(__file__))
# Get the absolute path to the main 'backend' directory (one level up)
BACKEND_DIR = os.path.dirname(MODELS_PY_DIR)
# --- END NEW ---

# --- CONFIGURATION (Using Absolute Paths) ---
DAILY_MODEL_DIR = os.path.join(BACKEND_DIR, "models_store/lstm_daily")
WEEKLY_MODEL_DIR = os.path.join(BACKEND_DIR, "models_store/lstm_weekly")
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
# NOTE: Both your daily and weekly Colab scripts use seq_length = 10
SEQ_LENGTH = 10 

# --- Load Daily Model Files ---
try:
    # --- ADD THIS PRINT STATEMENT TO DEBUG ---
    print(f"DEBUG: Trying to open: {os.path.join(DAILY_MODEL_DIR, 'daily_features.json')}")
    # -------------------------------------------
    with open(os.path.join(DAILY_MODEL_DIR, "daily_features.json"), 'r') as f:
        DAILY_FEATURES = json.load(f)
    print("✅ Daily features loaded.")
except Exception as e:
    print(f"🔴 ERROR: Could not load 'models_store/lstm_daily/daily_features.json'. Error: {e}")
    DAILY_FEATURES = []

# --- Load Weekly Model Files ---
try:
    # --- ADD THIS PRINT STATEMENT TO DEBUG ---
    print(f"DEBUG: Trying to open: {os.path.join(WEEKLY_MODEL_DIR, 'weekly_features.json')}")
    # -------------------------------------------
    with open(os.path.join(WEEKLY_MODEL_DIR, "weekly_features.json"), 'r') as f:
        WEEKLY_FEATURES = json.load(f) # Should be same as daily, but good practice
    print("✅ Weekly features loaded.")
except Exception as e:
    print(f"🔴 ERROR: Could not load 'models_store/lstm_weekly/weekly_features.json'. Error: {e}")
    WEEKLY_FEATURES = []


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
        model_path = os.path.join(DAILY_MODEL_DIR, f"daily_model_station_{station_id}.h5")
        scaler_path = os.path.join(DAILY_MODEL_DIR, f"daily_scaler_station_{station_id}.pkl")
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print(f"⏭️ Skipping {station_id} (Daily): model or scaler file not found.")
            continue
            
        try:
            model = load_model(model_path, compile=False)
            scaler = joblib.load(scaler_path)
        except Exception as e:
            print(f"🔴 ERROR loading model for {station_id} (Daily): {e}")
            continue

        # Get latest data
        station_df = df[df['stationId'] == station_id].sort_values('date')
        daily_avg = station_df.groupby('date', as_index=False)[DAILY_FEATURES].mean().dropna()

        if len(daily_avg) < SEQ_LENGTH:
            print(f"⏭️ Skipping {station_id} (Daily): not enough data in DB ({len(daily_avg)} days).")
            continue
            
        # Prepare the LAST sequence
        last_sequence_df = daily_avg.iloc[-SEQ_LENGTH:]
        last_sequence_scaled = scaler.transform(last_sequence_df)
        X_pred = np.array([last_sequence_scaled])

        # 3. Predict and inverse-transform
        with warnings.catch_warnings():
             warnings.simplefilter("ignore")
             future_pred_scaled = model.predict(X_pred)
             
        future_pred_inv = scaler.inverse_transform(future_pred_scaled)
        actual_today_inv = daily_avg[DAILY_FEATURES].values[-1]
        prediction_date = daily_avg['date'].max() + timedelta(days=1)
        
        # 4. Create Plotly JSON plot
        fig = go.Figure()
        fig.add_trace(go.Bar(x=DAILY_FEATURES, y=actual_today_inv, name=f'Actual (Today)', marker_color='blue'))
        fig.add_trace(go.Bar(x=DAILY_FEATURES, y=future_pred_inv[0], name=f'Predicted (Tomorrow)', marker_color='orange'))
        fig.update_layout(
            title=f"Station {station_id} - Daily Prediction for {prediction_date.strftime('%Y-%m-%d')}",
            barmode='group', xaxis_tickangle=-45
        )
        
        # 5. Save plot to JSON file
        output_path = os.path.join(output_json_dir, f"daily_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved plot for {station_id} (Daily)")

    print("--- Daily Prediction Batch Job Complete ---")


def create_weekly_prediction_plots(output_json_dir="static/predictions/weekly"):
    """
    LOADS pre-trained models, runs a 7-day recursive forecast,
    and saves Plotly JSON graphs.
    """
    print("--- Starting Weekly Prediction Batch Job ---")
    os.makedirs(output_json_dir, exist_ok=True)
    
    if not WEEKLY_FEATURES:
        print("🔴 Cannot run weekly predictions: feature list not loaded.")
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
        model_path = os.path.join(WEEKLY_MODEL_DIR, f"weekly_model_station_{station_id}.h5")
        scaler_path = os.path.join(WEEKLY_MODEL_DIR, f"weekly_scaler_station_{station_id}.pkl")
        
        if not os.path.exists(model_path) or not os.path.exists(scaler_path):
            print(f"⏭️ Skipping {station_id} (Weekly): model or scaler file not found.")
            continue
            
        try:
            model = load_model(model_path, compile=False)
            scaler = joblib.load(scaler_path)
        except Exception as e:
            print(f"🔴 ERROR loading model for {station_id} (Weekly): {e}")
            continue

        # Get latest data
        station_df = df[df['stationId'] == station_id].sort_values('date')
        daily_avg = station_df.groupby('date')[WEEKLY_FEATURES].mean().dropna()

        if len(daily_avg) < SEQ_LENGTH:
            print(f"⏭️ Skipping {station_id} (Weekly): not enough data in DB ({len(daily_avg)} days).")
            continue
            
        # 3. Prepare LAST sequence and run 7-day RECURSIVE forecast
        future_input_scaled = scaler.transform(daily_avg.iloc[-SEQ_LENGTH:])
        predictions_scaled = []

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            for _ in range(7): # Predict 7 days
                X_pred = future_input_scaled.reshape((1, SEQ_LENGTH, len(WEEKLY_FEATURES)))
                y_pred_scaled = model.predict(X_pred)[0]
                predictions_scaled.append(y_pred_scaled)
                # This is the recursive part:
                future_input_scaled = np.vstack([future_input_scaled[1:], y_pred_scaled])

        # 4. Inverse-transform and get average
        predictions_inv = scaler.inverse_transform(predictions_scaled)
        weekly_avg_pred = np.mean(predictions_inv, axis=0) # Average of the 7 days
        
        start_date = daily_avg['date'].max() + timedelta(days=1)
        end_date = start_date + timedelta(days=6)
        
        # 5. Create Plotly JSON plot
        fig = go.Figure()
        fig.add_trace(go.Scatter( # Using a line plot as in your Colab
            x=WEEKLY_FEATURES, 
            y=weekly_avg_pred,
            name=f'Predicted Weekly Avg',
            marker_color='red',
            mode='lines+markers'
        ))
        fig.update_layout(
            title=f"Station {station_id} - Predicted Weekly Average <br>({start_date.strftime('%b %d')} - {end_date.strftime('%b %d')})",
            xaxis_tickangle=-45
        )
        
        # 6. Save plot to JSON file
        output_path = os.path.join(output_json_dir, f"weekly_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved plot for {station_id} (Weekly)")

    print("--- Weekly Prediction Batch Job Complete ---")


# --- This makes the file runnable as a batch job ---
if __name__ == "__main__":
    # To run this, type in your terminal:
    # python models/predictions.py
    create_daily_prediction_plots()
    create_weekly_prediction_plots()