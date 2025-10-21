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

# --- Build Absolute Paths ---
MODELS_PY_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(MODELS_PY_DIR)
# --- END NEW ---

# --- CONFIGURATION (Using Absolute Paths) ---
DAILY_MODEL_DIR = os.path.join(BACKEND_DIR, "models_store/lstm_daily")
WEEKLY_MODEL_DIR = os.path.join(BACKEND_DIR, "models_store/lstm_weekly")
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
STATIC_PRED_DIR = os.path.join(BACKEND_DIR, "static/predictions")
SEQ_LENGTH = 10 

# --- Load features ---
try:
    with open(os.path.join(DAILY_MODEL_DIR, "daily_features.json"), 'r') as f:
        DAILY_FEATURES = json.load(f)
    print("✅ Daily features loaded.")
except Exception as e:
    DAILY_FEATURES = []

try:
    with open(os.path.join(WEEKLY_MODEL_DIR, "weekly_features.json"), 'r') as f:
        WEEKLY_FEATURES = json.load(f)
    print("✅ Weekly features loaded.")
except Exception as e:
    WEEKLY_FEATURES = []


def create_daily_prediction_plots(output_json_dir=os.path.join(STATIC_PRED_DIR, "daily")):
    # ... (This function remains unchanged) ...
    print("--- Starting Daily Prediction Batch Job ---")
    os.makedirs(output_json_dir, exist_ok=True)
    
    if not DAILY_FEATURES:
        print("🔴 Cannot run daily predictions: feature list not loaded.")
        return

    con = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
    finally:
        con.close()
        
    df['date'] = pd.to_datetime(df['timestampDate']).dt.date
    stations = df['stationId'].unique()

    all_daily_predictions = [] 

    for station_id in stations:
        model_path = os.path.join(DAILY_MODEL_DIR, f"daily_model_station_{station_id}.h5")
        scaler_path = os.path.join(DAILY_MODEL_DIR, f"daily_scaler_station_{station_id}.pkl")
        
        if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
            print(f"⏭️ Skipping {station_id} (Daily): model or scaler file not found.")
            continue
            
        try:
            model = load_model(model_path, compile=False)
            scaler = joblib.load(scaler_path)
        except Exception as e:
            print(f"🔴 ERROR loading model for {station_id} (Daily): {e}")
            continue

        station_df = df[df['stationId'] == station_id].sort_values('date')
        daily_avg = station_df.groupby('date', as_index=False)[DAILY_FEATURES].mean().dropna()

        if len(daily_avg) < SEQ_LENGTH:
            print(f"⏭️ Skipping {station_id} (Daily): not enough data in DB ({len(daily_avg)} days).")
            continue
            
        last_sequence_df = daily_avg.iloc[-SEQ_LENGTH:][DAILY_FEATURES]
        last_sequence_scaled = scaler.transform(last_sequence_df)
        X_pred = np.array([last_sequence_scaled])

        with warnings.catch_warnings():
             warnings.simplefilter("ignore")
             future_pred_scaled = model.predict(X_pred)
             
        future_pred_inv = scaler.inverse_transform(future_pred_scaled)
        actual_today_inv = daily_avg[DAILY_FEATURES].values[-1]
        prediction_date = (daily_avg['date'].max() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        pred_dict = {'stationId': station_id, 'date': prediction_date}
        pred_dict.update({param: future_pred_inv[0][i] for i, param in enumerate(DAILY_FEATURES)})
        all_daily_predictions.append(pred_dict)

        fig = go.Figure()
        fig.add_trace(go.Bar(x=DAILY_FEATURES, y=actual_today_inv, name=f'Actual (Today)', marker_color='blue'))
        fig.add_trace(go.Bar(x=DAILY_FEATURES, y=future_pred_inv[0], name=f'Predicted (Tomorrow)', marker_color='orange'))
        fig.update_layout(
            title=f"Station {station_id} - Daily Prediction for {prediction_date}",
            barmode='group', xaxis_tickangle=-45
        )
        output_path = os.path.join(output_json_dir, f"daily_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved plot for {station_id} (Daily)")

    if all_daily_predictions:
        summary_df = pd.DataFrame(all_daily_predictions)
        summary_path = os.path.join(STATIC_PRED_DIR, "daily_summary_predictions.json")
        summary_df.to_json(summary_path, orient="records")
        print(f"✅ Saved daily summary table to: {summary_path}")
    print("--- Daily Prediction Batch Job Complete ---")


def create_weekly_prediction_plots(
    output_plot_dir=os.path.join(STATIC_PRED_DIR, "weekly"), 
    output_details_dir=os.path.join(STATIC_PRED_DIR, "weekly_details") # <-- (NEW)
):
    print("--- Starting Weekly Prediction Batch Job ---")
    os.makedirs(output_plot_dir, exist_ok=True)
    os.makedirs(output_details_dir, exist_ok=True) # <-- (NEW)
    
    if not WEEKLY_FEATURES:
        print("🔴 Cannot run weekly predictions: feature list not loaded.")
        return

    con = sqlite3.connect(DB_PATH)
    try:
        df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
    finally:
        con.close()
        
    df['date'] = pd.to_datetime(df['timestampDate']).dt.date
    stations = df['stationId'].unique()

    all_weekly_predictions = [] 

    for station_id in stations:
        model_path = os.path.join(WEEKLY_MODEL_DIR, f"weekly_model_station_{station_id}.h5")
        scaler_path = os.path.join(WEEKLY_MODEL_DIR, f"weekly_scaler_station_{station_id}.pkl")
        
        if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
            print(f"⏭️ Skipping {station_id} (Weekly): model or scaler file not found.")
            continue
        try:
            model = load_model(model_path, compile=False)
            scaler = joblib.load(scaler_path)
        except Exception as e:
            print(f"🔴 ERROR loading model for {station_id} (Weekly): {e}")
            continue

        station_df = df[df['stationId'] == station_id].sort_values('date')
        daily_avg = station_df.groupby('date', as_index=False)[WEEKLY_FEATURES].mean().dropna()

        if len(daily_avg) < SEQ_LENGTH:
            print(f"⏭️ Skipping {station_id} (Weekly): not enough data.")
            continue
            
        future_input_df = daily_avg.iloc[-SEQ_LENGTH:][WEEKLY_FEATURES]
        future_input_scaled = scaler.transform(future_input_df)
        predictions_scaled = []

        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            for _ in range(7): 
                X_pred = future_input_scaled.reshape((1, SEQ_LENGTH, len(WEEKLY_FEATURES)))
                y_pred_scaled = model.predict(X_pred)[0]
                predictions_scaled.append(y_pred_scaled)
                future_input_scaled = np.vstack([future_input_scaled[1:], y_pred_scaled])

        predictions_inv = scaler.inverse_transform(predictions_scaled)
        weekly_avg_pred = np.mean(predictions_inv, axis=0)
        
        start_date = (daily_avg['date'].max() + timedelta(days=1))
        end_date = (start_date + timedelta(days=6))
        
        # --- (NEW) Create and store the summary record ---
        pred_dict = {'stationId': station_id, 'date': f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"} 
        pred_dict.update({param: weekly_avg_pred[i] for i, param in enumerate(WEEKLY_FEATURES)})
        all_weekly_predictions.append(pred_dict)
        # --- (END NEW) ---

        # --- (NEW) Create and save the DETAILED 7-DAY table (like your Colab) ---
        pred_df = pd.DataFrame(predictions_inv, columns=WEEKLY_FEATURES).round(3)
        stats_df = pd.DataFrame({
            'Avg': pred_df.mean(),
            'Min': pred_df.min(),
            'Max': pred_df.max(),
            'Std': pred_df.std()
        }).T.round(3)
        
        # Add "Day 1", "Day 2", etc. to the index
pred_df.index = [f"{(start_date + timedelta(days=i)).strftime('%Y-%m-%d')} (Day {i+1})" for i in range(7)]        full_table_df = pd.concat([pred_df, stats_df])
        
        # Save this detailed table as its own JSON
        details_path = os.path.join(output_details_dir, f"weekly_details_station_{station_id}.json")
        # orient='index' creates a JSON object: {"Day 1": {"BOD": ...}, "Avg": {"BOD": ...}}
        full_table_df.to_json(details_path, orient="index") 
        print(f"✅ Saved weekly DETAILS table for {station_id}")
        # --- (END NEW) ---

        # --- (EXISTING) Save the average plot ---
        fig = go.Figure()
        fig.add_trace(go.Scatter(
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
        output_path = os.path.join(output_plot_dir, f"weekly_pred_station_{station_id}.json")
        fig.write_json(output_path)
        print(f"✅ Saved weekly AVG plot for {station_id}")

    if all_weekly_predictions:
        summary_df = pd.DataFrame(all_weekly_predictions)
        summary_path = os.path.join(STATIC_PRED_DIR, "weekly_summary_predictions.json")
        summary_df.to_json(summary_path, orient="records")
        print(f"✅ Saved weekly summary table to: {summary_path}")
    print("--- Weekly Prediction Batch Job Complete ---")


if __name__ == "__main__":
    create_daily_prediction_plots()
    create_weekly_prediction_plots()



# # models/predictions.py
# import pandas as pd
# import numpy as np
# import sqlite3
# import plotly.graph_objects as go
# from sklearn.preprocessing import MinMaxScaler
# from tensorflow.keras.models import load_model
# import joblib
# import json
# import os
# import warnings
# from datetime import datetime, timedelta

# # Suppress TensorFlow warnings
# os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
# warnings.filterwarnings('ignore', category=UserWarning, module='tensorflow')

# # --- NEW: Build Absolute Paths ---
# MODELS_PY_DIR = os.path.dirname(os.path.abspath(__file__))
# BACKEND_DIR = os.path.dirname(MODELS_PY_DIR)
# # --- END NEW ---

# # --- CONFIGURATION (Using Absolute Paths) ---
# DAILY_MODEL_DIR = os.path.join(BACKEND_DIR, "models_store/lstm_daily")
# WEEKLY_MODEL_DIR = os.path.join(BACKEND_DIR, "models_store/lstm_weekly")
# DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
# STATIC_PRED_DIR = os.path.join(BACKEND_DIR, "static/predictions") # <-- NEW
# SEQ_LENGTH = 10 

# # --- Load features ---
# try:
#     with open(os.path.join(DAILY_MODEL_DIR, "daily_features.json"), 'r') as f:
#         DAILY_FEATURES = json.load(f)
#     print("✅ Daily features loaded.")
# except Exception as e:
#     DAILY_FEATURES = []

# try:
#     with open(os.path.join(WEEKLY_MODEL_DIR, "weekly_features.json"), 'r') as f:
#         WEEKLY_FEATURES = json.load(f)
#     print("✅ Weekly features loaded.")
# except Exception as e:
#     WEEKLY_FEATURES = []


# def create_daily_prediction_plots(output_json_dir=os.path.join(STATIC_PRED_DIR, "daily")): # <-- MODIFIED
#     print("--- Starting Daily Prediction Batch Job ---")
#     os.makedirs(output_json_dir, exist_ok=True)
    
#     if not DAILY_FEATURES:
#         print("🔴 Cannot run daily predictions: feature list not loaded.")
#         return

#     con = sqlite3.connect(DB_PATH)
#     try:
#         df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
#     finally:
#         con.close()
        
#     df['date'] = pd.to_datetime(df['timestampDate']).dt.date
#     stations = df['stationId'].unique()

#     all_daily_predictions = [] # <-- NEW: To store summary records

#     for station_id in stations:
#         model_path = os.path.join(DAILY_MODEL_DIR, f"daily_model_station_{station_id}.h5")
#         scaler_path = os.path.join(DAILY_MODEL_DIR, f"daily_scaler_station_{station_id}.pkl")
        
#         if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
#             print(f"⏭️ Skipping {station_id} (Daily): model or scaler file not found.")
#             continue
            
#         try:
#             model = load_model(model_path, compile=False)
#             scaler = joblib.load(scaler_path)
#         except Exception as e:
#             print(f"🔴 ERROR loading model for {station_id} (Daily): {e}")
#             continue

#         station_df = df[df['stationId'] == station_id].sort_values('date')
#         daily_avg = station_df.groupby('date', as_index=False)[DAILY_FEATURES].mean().dropna()

#         if len(daily_avg) < SEQ_LENGTH:
#             print(f"⏭️ Skipping {station_id} (Daily): not enough data in DB ({len(daily_avg)} days).")
#             continue
            
#         last_sequence_df = daily_avg.iloc[-SEQ_LENGTH:][DAILY_FEATURES]
#         last_sequence_scaled = scaler.transform(last_sequence_df)
#         X_pred = np.array([last_sequence_scaled])

#         with warnings.catch_warnings():
#              warnings.simplefilter("ignore")
#              future_pred_scaled = model.predict(X_pred)
             
#         future_pred_inv = scaler.inverse_transform(future_pred_scaled)
#         actual_today_inv = daily_avg[DAILY_FEATURES].values[-1]
#         prediction_date = (daily_avg['date'].max() + timedelta(days=1)).strftime('%Y-%m-%d')
        
#         # --- (NEW) Create and store the summary record (like your Colab) ---
#         pred_dict = {'stationId': station_id, 'date': prediction_date}
#         pred_dict.update({param: future_pred_inv[0][i] for i, param in enumerate(DAILY_FEATURES)})
#         all_daily_predictions.append(pred_dict)
#         # --- (END NEW) ---

#         # ... (Create Plotly JSON) ...
#         fig = go.Figure()
#         fig.add_trace(go.Bar(x=DAILY_FEATURES, y=actual_today_inv, name=f'Actual (Today)', marker_color='blue'))
#         fig.add_trace(go.Bar(x=DAILY_FEATURES, y=future_pred_inv[0], name=f'Predicted (Tomorrow)', marker_color='orange'))
#         fig.update_layout(
#             title=f"Station {station_id} - Daily Prediction for {prediction_date}",
#             barmode='group', xaxis_tickangle=-45
#         )
#         output_path = os.path.join(output_json_dir, f"daily_pred_station_{station_id}.json")
#         fig.write_json(output_path)
#         print(f"✅ Saved plot for {station_id} (Daily)")

#     # --- (NEW) Save the final summary table ---
#     if all_daily_predictions:
#         summary_df = pd.DataFrame(all_daily_predictions)
#         summary_path = os.path.join(STATIC_PRED_DIR, "daily_summary_predictions.json")
#         summary_df.to_json(summary_path, orient="records")
#         print(f"✅ Saved daily summary table to: {summary_path}")
#     # --- (END NEW) ---
#     print("--- Daily Prediction Batch Job Complete ---")


# def create_weekly_prediction_plots(output_json_dir=os.path.join(STATIC_PRED_DIR, "weekly")): # <-- MODIFIED
#     print("--- Starting Weekly Prediction Batch Job ---")
#     os.makedirs(output_json_dir, exist_ok=True)
    
#     if not WEEKLY_FEATURES:
#         print("🔴 Cannot run weekly predictions: feature list not loaded.")
#         return

#     con = sqlite3.connect(DB_PATH)
#     try:
#         df = pd.read_sql_query("SELECT * FROM water_records", con, parse_dates=["timestampDate"])
#     finally:
#         con.close()
        
#     df['date'] = pd.to_datetime(df['timestampDate']).dt.date
#     stations = df['stationId'].unique()

#     all_weekly_predictions = [] # <-- NEW: To store summary records

#     for station_id in stations:
#         # ... (Same model loading logic as daily) ...
#         model_path = os.path.join(WEEKLY_MODEL_DIR, f"weekly_model_station_{station_id}.h5")
#         scaler_path = os.path.join(WEEKLY_MODEL_DIR, f"weekly_scaler_station_{station_id}.pkl")
        
#         if not (os.path.exists(model_path) and os.path.exists(scaler_path)):
#             print(f"⏭️ Skipping {station_id} (Weekly): model or scaler file not found.")
#             continue
#         try:
#             model = load_model(model_path, compile=False)
#             scaler = joblib.load(scaler_path)
#         except Exception as e:
#             print(f"🔴 ERROR loading model for {station_id} (Weekly): {e}")
#             continue

#         station_df = df[df['stationId'] == station_id].sort_values('date')
#         daily_avg = station_df.groupby('date', as_index=False)[WEEKLY_FEATURES].mean().dropna()

#         if len(daily_avg) < SEQ_LENGTH:
#             print(f"⏭️ Skipping {station_id} (Weekly): not enough data.")
#             continue
            
#         future_input_df = daily_avg.iloc[-SEQ_LENGTH:][WEEKLY_FEATURES]
#         future_input_scaled = scaler.transform(future_input_df)
#         predictions_scaled = []

#         with warnings.catch_warnings():
#             warnings.simplefilter("ignore")
#             for _ in range(7): 
#                 X_pred = future_input_scaled.reshape((1, SEQ_LENGTH, len(WEEKLY_FEATURES)))
#                 y_pred_scaled = model.predict(X_pred)[0]
#                 predictions_scaled.append(y_pred_scaled)
#                 future_input_scaled = np.vstack([future_input_scaled[1:], y_pred_scaled])

#         predictions_inv = scaler.inverse_transform(predictions_scaled)
#         weekly_avg_pred = np.mean(predictions_inv, axis=0)
        
#         start_date = (daily_avg['date'].max() + timedelta(days=1)).strftime('%Y-%m-%d')
#         end_date = (daily_avg['date'].max() + timedelta(days=7)).strftime('%Y-%m-%d')
        
#         # --- (NEW) Create and store the summary record ---
#         pred_dict = {'stationId': station_id, 'date': f"{start_date} to {end_date}"} 
#         pred_dict.update({param: weekly_avg_pred[i] for i, param in enumerate(WEEKLY_FEATURES)})
#         all_weekly_predictions.append(pred_dict)
#         # --- (END NEW) ---

#         # ... (Create Plotly JSON) ...
#         fig = go.Figure()
#         fig.add_trace(go.Scatter(
#             x=WEEKLY_FEATURES, 
#             y=weekly_avg_pred,
#             name=f'Predicted Weekly Avg',
#             marker_color='red',
#             mode='lines+markers'
#         ))
#         fig.update_layout(
#             title=f"Station {station_id} - Predicted Weekly Average <br>({start_date} - {end_date})",
#             xaxis_tickangle=-45
#         )
#         output_path = os.path.join(output_json_dir, f"weekly_pred_station_{station_id}.json")
#         fig.write_json(output_path)
#         print(f"✅ Saved plot for {station_id} (Weekly)")

#     # --- (NEW) Save the final summary table ---
#     if all_weekly_predictions:
#         summary_df = pd.DataFrame(all_weekly_predictions)
#         summary_path = os.path.join(STATIC_PRED_DIR, "weekly_summary_predictions.json")
#         summary_df.to_json(summary_path, orient="records")
#         print(f"✅ Saved weekly summary table to: {summary_path}")
#     # --- (END NEW) ---
#     print("--- Weekly Prediction Batch Job Complete ---")


# if __name__ == "__main__":
#     create_daily_prediction_plots()
#     create_weekly_prediction_plots()