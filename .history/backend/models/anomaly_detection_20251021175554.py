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

# --- CONFIGURATION ---
DB_PATH = "database/water_quality.db"
TABLE_NAME = "water_records"
OUTPUT_JSON = "static/anomaly/anomaly_heatmap.json"
WINDOW_SIZE = 30 # How many hours to look at for one anomaly

def run_anomaly_detection():
    """
    Trains an LSTM Autoencoder, finds anomalies, and saves a 
    single Plotly heatmap as a JSON file.
    """
    print("--- Starting Anomaly Detection Batch Job (Heatmap) ---")
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    
    # --- 1. Load and Preprocess Data ---
    try:
        con = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(f"SELECT * FROM {TABLE_NAME}", con, parse_dates=['timestamp'])
    except Exception as e:
        print(f"🔴 ERROR: Could not read from database. {e}")
        return
    finally:
        con.close()

    df = df.dropna(subset=['stationId', 'timestamp'])
    
    # Get all numeric parameter columns
    exclude_cols = ['stationId', 'timestamp', 'timestampDate']
    params = [c for c in df.columns if c not in exclude_cols and pd.api.types.is_numeric_dtype(df[c])]
    
    if not params:
        print("🔴 ERROR: No numeric parameters found for anomaly detection.")
        return

    df = df.groupby(['stationId', 'timestamp'], as_index=False)[params].mean()
    df = df.sort_values(['stationId', 'timestamp'])

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
                anomaly_timestamp = station_df.iloc[i + WINDOW_SIZE - 1]['timestamp']
                
                # Find *which parameter* caused the anomaly
                for param_idx, param in enumerate(params):
                    param_mae = mae[i, param_idx]
                    if param_mae > threshold: # If this specific param is bad
                        all_anomalies.append({
                            "stationId": station,
                            "timestamp": anomaly_timestamp,
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

    fig = go.Figure(data=go.Heatmap(
        z=heatmap_values.values,
        x=heatmap_values.columns,
        y=heatmap_values.index.astype(str), # Ensure y-axis is string
        text=custom_hover,
        hoverinfo="text",
        colorscale='Reds'
    ))
    
    fig.update_layout(
        title="Anomaly Count per Parameter and Station",
        xaxis_title="Parameter",
        yaxis_title="Station ID",
        height=max(600, len(stations) * 20),
        xaxis=dict(tickangle=315),
        yaxis=dict(type='category')
    )

    # --- 4. Save Plot to JSON (MODIFIED for full ndarray conversion) ---
    print(f"   Converting plot to JSON and ensuring standard list formats...")
    # Convert Plotly figure to a dictionary
    fig_dict = fig.to_dict()

    # Explicitly convert potential numpy arrays (x, y, z) in the heatmap trace to lists
    # This assumes the heatmap data is the first trace (fig_dict['data'][0])
    if 'data' in fig_dict and len(fig_dict['data']) > 0 and isinstance(fig_dict['data'][0], dict):
        trace = fig_dict['data'][0]
        for key in ['x', 'y', 'z']:
            if key in trace:
                data_array = trace[key]
                if isinstance(data_array, np.ndarray):
                    # Convert numpy array to standard list (nested if necessary for 'z')
                    print(f"   Converting numpy array for key '{key}' to list...")
                    trace[key] = data_array.tolist()
                elif isinstance(data_array, list) and key == 'z':
                     # Ensure nested lists for 'z' are standard lists too (handles edge cases)
                     trace[key] = [[(int(item) if isinstance(item, np.integer) else item) for item in row] for row in data_array]


        # Also ensure 'text' (hover text) doesn't contain numpy types if it exists
        # Note: We created 'custom_hover' as a list of strings, so it should be fine,
        # but if Plotly converted it back, this adds safety.
        if 'text' in trace and isinstance(trace['text'], np.ndarray):
             print(f"   Converting numpy array for key 'text' to list...")
             trace['text'] = trace['text'].tolist()
        elif 'text' in trace and isinstance(trace['text'], list):
             # Ensure nested lists within text are also standard lists/strings
             trace['text'] = [[str(item) for item in row] if isinstance(row, list) else str(row) for row in trace['text']]


    print(f"✅ Saving heatmap JSON (with standard lists) to: {OUTPUT_JSON}")
    # Save the modified dictionary as JSON
    try:
        with open(OUTPUT_JSON, 'w') as f:
            # Use indent for readability when checking the file
            json.dump(fig_dict, f, indent=2)
    except TypeError as e:
        print(f"🔴 ERROR: JSON serialization failed AFTER attempting conversions: {e}")
        # Add more debugging here if it still fails, e.g., print problematic part of fig_dict
    except Exception as e:
        print(f"🔴 ERROR: Failed to write JSON to {OUTPUT_JSON}: {e}")

    # --- (END MODIFIED SECTION) ---

    print("--- Anomaly Detection Batch Job Complete ---")


# --- This makes the file runnable as a batch job ---
if __name__ == "__main__":
    run_anomaly_detection()