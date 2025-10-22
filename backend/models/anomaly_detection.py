# models/anomaly_detection.py
import pandas as pd
import numpy as np
import sqlite3
from keras.models import Sequential
from keras.layers import LSTM, RepeatVector, TimeDistributed, Dense
from sklearn.preprocessing import MinMaxScaler
import plotly.graph_objects as go
import json
import os
import warnings

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=UserWarning, module='tensorflow')

# --- Build Absolute Paths ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
# --- END NEW ---

# --- CONFIGURATION (Using Absolute Paths) ---
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
TABLE_NAME = "water_records"
OUTPUT_JSON = os.path.join(BACKEND_DIR, "static/anomaly/anomaly_heatmap.json")
WINDOW_SIZE = 30 # How many hours to look at for one anomaly

def run_anomaly_detection():
    """
    Trains an LSTM Autoencoder, finds anomalies, and saves a 
    single Plotly heatmap as a JSON file.
    """
    print("--- Starting Anomaly Detection Batch Job (Heatmap) ---")
    # Ensure directories exist BEFORE trying to use them
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    
    # --- 1. Load and Preprocess Data ---
    conn = None # Initialize conn
    try:
        conn = sqlite3.connect(DB_PATH)
        # Use timestampDate for parsing, as 'timestamp' is the raw string
        df = pd.read_sql_query(f"SELECT * FROM {TABLE_NAME}", conn) # Read as text
        df['timestampDate'] = pd.to_datetime(df['timestampDate'], errors='coerce') # Convert manually
    except Exception as e:
        print(f"🔴 ERROR: Could not read from database. {e}")
        return # Exit if data can't be read
    finally:
        if conn: # Only close if connection was successful
            conn.close()

    df = df.dropna(subset=['stationId', 'timestampDate'])
    
    # Get all numeric parameter columns
    exclude_cols = ['stationId', 'timestamp', 'timestampDate']
    params = [c for c in df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]
    
    if not params:
        print("🔴 ERROR: No numeric parameters found for anomaly detection.")
        return

    # Use timestampDate for sorting
    df = df.groupby(['stationId', 'timestampDate'], as_index=False)[params].mean()
    df = df.sort_values(['stationId', 'timestampDate'])

    def create_sequences(data, window_size):
        return np.array([data[i:i + window_size] for i in range(len(data) - window_size)])

    all_anomalies = []
    stations = df['stationId'].unique()
    
    # --- 2. Train Model and Detect Anomalies (Per Station) ---
    for station in stations:
        print(f"   Processing anomalies for station: {station}...")
        station_df = df[df['stationId'] == station].copy()
        
        if len(station_df) < WINDOW_SIZE * 2:
            print(f"   ⏭️ Skipping station {station}: not enough data.")
            continue
            
        scaler = MinMaxScaler(feature_range=(0, 1))
        station_df[params] = scaler.fit_transform(station_df[params])
        
        sequences = create_sequences(station_df[params].values, WINDOW_SIZE)
        if sequences.shape[0] == 0:
            print(f"   ⏭️ Skipping station {station}: failed to create sequences.")
            continue
        
        X_train = sequences
        
        # Define and train model
        model = Sequential([
            LSTM(64, activation='relu', input_shape=(WINDOW_SIZE, len(params)), return_sequences=False),
            RepeatVector(WINDOW_SIZE),
            LSTM(64, activation='relu', return_sequences=True),
            TimeDistributed(Dense(len(params)))
        ])
        model.compile(optimizer='adam', loss='mae')
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model.fit(X_train, X_train, epochs=20, batch_size=32, verbose=0)
            X_pred = model.predict(X_train, verbose=0)
        
        # Calculate reconstruction error
        mae = np.mean(np.abs(X_pred - X_train), axis=1)
        
        # Find anomalies
        threshold = np.quantile(mae, 0.95) # 95th percentile
        
        for i in range(len(mae)): # Loop through each sequence
            if mae[i].mean() > threshold: # If the *sequence* is anomalous
                # Get the timestamp from the end of the sequence
                anomaly_timestamp = station_df.iloc[i + WINDOW_SIZE - 1]['timestampDate']
                
                # Find *which parameter* caused the anomaly
                for param_idx, param in enumerate(params):
                    param_mae = mae[i, param_idx]
                    if param_mae > threshold: # If this specific param is bad
                        all_anomalies.append({
                            "stationId": station,
                            "timestamp": anomaly_timestamp, # Use the parsed datetime
                            "Parameter": param
                        })

    if not all_anomalies:
        print("⚠️ No anomalies found across all stations.")
        return

    # --- 3. Create Plotly Heatmap ---
    print("   Aggregating anomalies for heatmap...")
    anomaly_df = pd.DataFrame(all_anomalies)
    anomaly_df['date'] = anomaly_df['timestamp'].dt.strftime('%Y-%m-%d')
    
    summary_data = anomaly_df.groupby(['stationId', 'Parameter'])['date'].agg(
        Anomaly_Count='count',
        Sample_Dates=lambda x: ', '.join(x.unique())
    ).reset_index()

    heatmap_values = summary_data.pivot(index='stationId', columns='Parameter', values='Anomaly_Count').fillna(0)
    hover_text = summary_data.pivot(index='stationId', columns='Parameter', values='Sample_Dates').fillna("No anomalies")
    
    heatmap_values = heatmap_values.sort_index()
    hover_text = hover_text.reindex_like(heatmap_values)

    custom_hover = []
    for r_idx, row in enumerate(heatmap_values.index):
        row_hover = []
        for c_idx, col in enumerate(heatmap_values.columns):
            count = heatmap_values.iloc[r_idx, c_idx]
            dates = hover_text.iloc[r_idx, c_idx]
            row_hover.append(f"<b>Parameter: {col}</b><br>Station ID: {row}<br>Anomalies: {count}<br>Dates: {dates}")
        custom_hover.append(row_hover)

    # --- 4. Save Plot to JSON (REVISED for robust ndarray conversion and text) ---
    print(f"   Converting plot to JSON and ensuring standard list formats...")

    # Create the initial figure object
    fig = go.Figure(data=go.Heatmap(
        z=heatmap_values.values,
        x=heatmap_values.columns.tolist(),
        y=heatmap_values.index.astype(str).tolist(),

        text=heatmap_values.values,
        texttemplate="%{text:.0f}",
        hovertext=custom_hover,
        hoverinfo="text",
        colorscale='Reds'
    ))

    fig.update_layout(
        title="Anomaly Count per Parameter and Station",
        xaxis_title="Parameter",
        yaxis_title="Station ID",
        height=max(600, len(heatmap_values.index) * 20),
        xaxis=dict(tickangle=315),
        yaxis=dict(type='category')
    )
    
    fig_dict = fig.to_dict()

    # Specifically target the z, x, y data within the dict and ensure they are lists
    if 'data' in fig_dict and len(fig_dict['data']) > 0 and isinstance(fig_dict['data'][0], dict):
        trace = fig_dict['data'][0]
        for key in ['x', 'y', 'z', 'text', 'hovertext']: # Check all data keys
            if key in trace:
                data_array = trace[key]
                if isinstance(data_array, np.ndarray):
                    print(f"   Converting numpy array for key '{key}' to list...")
                    trace[key] = data_array.tolist()
                elif key in ['z', 'text', 'hovertext'] and isinstance(data_array, list):
                    # Ensure inner elements are also standard types
                    trace[key] = [
                        [int(item) if isinstance(item, (np.integer, np.floating)) else str(item) for item in row]
                        if isinstance(row, (list, np.ndarray)) else row
                        for row in data_array
                    ]

    print(f"✅ Saving heatmap JSON (with standard lists) to: {OUTPUT_JSON}")
    try:
        with open(OUTPUT_JSON, 'w') as f:
            json.dump(fig_dict, f, indent=2)
    except TypeError as e:
        print(f"🔴 ERROR: JSON serialization failed AFTER conversions: {e}")
    except Exception as e:
        print(f"🔴 ERROR: Failed to write JSON to {OUTPUT_JSON}: {e}")

    print("--- Anomaly Detection Batch Job Complete ---")


if __name__ == "__main__":
    run_anomaly_detection()