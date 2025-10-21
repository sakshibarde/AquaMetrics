# main.py
# main.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import sqlite3
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler

# --- Import your logic functions ---
from models.classification import predict_water_quality, features as classification_features
from update_pipeline import fetch_and_update_data

# --- (NEW) Define Absolute Path for Backend Directory ---
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# --- CONFIGURATION (Using Absolute Paths) ---
DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
TABLE_NAME = "water_records"
LOCATIONS_CSV_PATH = os.path.join(BACKEND_DIR, "data/cpcb_station_locations.csv")
# --- (MODIFIED) Use BACKEND_DIR to make STATIC_DIR absolute ---
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
# --- The rest will now be absolute paths too ---
DAILY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/daily")
WEEKLY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/weekly")
DAYNIGHT_DIR = os.path.join(STATIC_DIR, "daynight")
ANOMALY_PLOT_PATH = os.path.join(STATIC_DIR, "anomaly/anomaly_heatmap.json")
CORRELATION_DIR = os.path.join(STATIC_DIR, "correlation")
WEEKLY_DETAILS_DIR = os.path.join(STATIC_DIR, "predictions/weekly_details")
DAILY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/daily_summary_predictions.json")
WEEKLY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/weekly_summary_predictions.json")

# --- FLASK APP SETUP ---
# Use the absolute STATIC_DIR path for static_folder
app = Flask(__name__, static_folder=STATIC_DIR)
CORS(app)

# --- Endpoint to get Station List ---
@app.route('/api/stations', methods=['GET'])
def get_stations():
    # ... (Keep the existing get_stations function code - it's okay) ...
    try:
        locations_df = pd.read_csv(LOCATIONS_CSV_PATH)
        locations_df = locations_df[['station_id', 'station_name', 'latitude', 'longitude', 'state']].rename(columns={
            'station_id': 'stationId', 'station_name': 'name', 'latitude': 'lat', 'longitude': 'lng', 'state': 'location'
        })
        locations_df['stationId'] = locations_df['stationId'].astype(int)
    except Exception as e:
        print(f"🔴 ERROR loading locations CSV '{LOCATIONS_CSV_PATH}': {e}")
        return jsonify({"error": "Failed to load station location data."}), 500
    try:
        con = sqlite3.connect(DB_PATH)
        query = f"""
        SELECT t1.* FROM {TABLE_NAME} t1 INNER JOIN (SELECT stationId, MAX(timestampDate) as MaxTimestamp FROM {TABLE_NAME} GROUP BY stationId) t2
        ON t1.stationId = t2.stationId AND t1.timestampDate = t2.MaxTimestamp
        """
        latest_df = pd.read_sql_query(query, con)
        latest_df['stationId'] = latest_df['stationId'].astype(int)
    except Exception as e:
        print(f"🔴 ERROR fetching latest station data: {e}")
        return jsonify({"error": "Failed to fetch station data."}), 500
    finally:
        con.close()
    if latest_df.empty:
        print("🟡 WARNING: No recent station data found.")
        locations_df['quality'] = 'Medium'
        return jsonify(locations_df.to_dict('records'))
    classified_qualities = {}
    for index, row in latest_df.iterrows():
        station_id = int(row['stationId'])
        input_data = {feat: row.get(feat, 0) if pd.notna(row.get(feat)) else 0 for feat in classification_features}
        quality_result = predict_water_quality(input_data)
        classified_qualities[station_id] = quality_result['class'] if quality_result['status'] == 'success' else 'Medium'
        if quality_result['status'] != 'success': print(f"⚠️ Failed classify {station_id}: {quality_result.get('message')}")
    locations_df['quality'] = locations_df['stationId'].map(classified_qualities).fillna('Medium')
    final_station_list = locations_df[locations_df['stationId'].isin(latest_df['stationId'].unique())].to_dict('records')
    if final_station_list: print(f"\n--- DEBUG Stations: First item: {final_station_list[0]} ---\n")
    else: print("\n--- DEBUG Stations: final_station_list is empty! ---\n")
    return jsonify(final_station_list)


# --- LIVE PREDICTION API ---
@app.route('/api/classify', methods=['POST'])
def handle_classification():
    user_input = request.json
    result = predict_water_quality(user_input)
    if result['status'] == 'error':
        print(f"🔴 ERROR IN /api/classify: {result.get('message', 'Unknown error')}")
        return jsonify(result), 400
    return jsonify(result)

# --- PRE-GENERATED PLOT APIs ---

# --- (MODIFIED) Daily Prediction Endpoint with Debug Prints ---
@app.route('/api/predictions/daily/<station_id>', methods=['GET'])
def get_daily_prediction(station_id):
    """
    Fetches the pre-generated daily prediction JSON for a station.
    """
    filename = f"daily_pred_station_{station_id}.json"
    plot_path = os.path.join(DAILY_PRED_DIR, filename)

    # --- ADDED DEBUG PRINTS ---
    abs_plot_path = os.path.abspath(plot_path)
    print(f"\n--- DEBUG Daily Prediction ---")
    print(f"Station ID requested: {station_id}")
    print(f"Checking for file (relative): {plot_path}")
    print(f"Checking for file (absolute): {abs_plot_path}")
    # ---------------------------

    if not os.path.exists(abs_plot_path): # Use absolute path for check
        print(f"DEBUG: File NOT FOUND at {abs_plot_path}")
        print(f"--- End DEBUG ---\n")
        return jsonify({"error": "Prediction plot not found for this station."}), 404
    else:
        print(f"DEBUG: File FOUND at {abs_plot_path}") # Confirmation
        print(f"--- End DEBUG ---\n")

    try:
        with open(abs_plot_path, 'r') as f: # Use absolute path to open
            return json.load(f)
    except Exception as e:
        print(f"🔴 ERROR reading daily plot file {abs_plot_path}: {e}")
        return jsonify({"error": f"Failed to read plot file: {e}"}), 500
# --- (END MODIFIED) ---

@app.route('/api/predictions/weekly/<station_id>', methods=['GET'])
def get_weekly_prediction(station_id):
    filename = f"weekly_pred_station_{station_id}.json"
    plot_path = os.path.join(WEEKLY_PRED_DIR, filename)
    abs_plot_path = os.path.abspath(plot_path) # Use absolute path
    print(f"DEBUG Weekly: Checking for {abs_plot_path}")
    if not os.path.exists(abs_plot_path): return jsonify({"error": "Plot not found."}), 404
    try:
        with open(abs_plot_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

@app.route('/api/predictions/weekly_details/<station_id>', methods=['GET'])
def get_weekly_details(station_id):
    filename = f"weekly_details_station_{station_id}.json"
    plot_path = os.path.join(WEEKLY_DETAILS_DIR, filename)
    abs_plot_path = os.path.abspath(plot_path) # Use absolute path
    print(f"DEBUG Weekly Details: Checking for {abs_plot_path}")
    if not os.path.exists(abs_plot_path): return jsonify({"error": "Details not found."}), 404
    try:
        with open(abs_plot_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

@app.route('/api/predictions/summary/daily', methods=['GET'])
def get_daily_summary():
    abs_path = os.path.abspath(DAILY_SUMMARY_PATH) # Use absolute path
    print(f"DEBUG Daily Summary: Checking for {abs_path}")
    if not os.path.exists(abs_path): return jsonify({"error": "File not found."}), 404
    try:
        with open(abs_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

@app.route('/api/predictions/summary/weekly', methods=['GET'])
def get_weekly_summary():
    abs_path = os.path.abspath(WEEKLY_SUMMARY_PATH) # Use absolute path
    print(f"DEBUG Weekly Summary: Checking for {abs_path}")
    if not os.path.exists(abs_path): return jsonify({"error": "File not found."}), 404
    try:
        with open(abs_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

@app.route('/api/anomaly-heatmap', methods=['GET'])
def get_anomaly_map():
    abs_path = os.path.abspath(ANOMALY_PLOT_PATH) # Use absolute path
    print(f"DEBUG Anomaly Heatmap: Checking for {abs_path}")
    if not os.path.exists(abs_path): return jsonify({"error": "File not found."}), 404
    try:
        with open(abs_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

@app.route('/api/correlation/<station_id>', methods=['GET'])
def get_correlation_plot(station_id):
    method = request.args.get('method', 'spearman').lower()
    if method not in ['pearson', 'spearman', 'kendall']: method = 'spearman'
    filename = f"correlation_station_{station_id}_{method}.json"
    plot_path = os.path.join(CORRELATION_DIR, filename)
    abs_plot_path = os.path.abspath(plot_path) # Use absolute path
    print(f"DEBUG Correlation ({method}): Checking for {abs_plot_path}")
    if not os.path.exists(abs_plot_path): return jsonify({"error": f"Plot ({method}) not found."}), 404
    try:
        with open(abs_plot_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

# --- STATIC FILE ENDPOINTS ---
@app.route('/api/daynight/list', methods=['GET'])
def list_daynight_plots():
    abs_daynight_dir = os.path.abspath(DAYNIGHT_DIR) # Use absolute path
    print(f"DEBUG DayNight List: Checking in {abs_daynight_dir}")
    try:
        # List files using the absolute directory path
        files = [f for f in os.listdir(abs_daynight_dir) if f.endswith(".png")]
        print(f"DEBUG DayNight List: Found files: {files}")
        return jsonify(files)
    except FileNotFoundError:
        print(f"DEBUG DayNight List: Directory NOT FOUND at {abs_daynight_dir}")
        return jsonify({"error": "Directory not found."}), 404
    except Exception as e:
        print(f"🔴 ERROR listing DayNight files in {abs_daynight_dir}: {e}")
        return jsonify({"error": f"Failed to list files: {e}"}), 500


# --- START THE SCHEDULER & APP ---
if __name__ == '__main__':
    abs_locations_path = os.path.abspath(LOCATIONS_CSV_PATH) # Use absolute path
    if not os.path.exists(abs_locations_path):
        print(f"🚨 WARNING: Location file not found at '{abs_locations_path}'.")
    else:
        print(f"✅ Location file found at '{abs_locations_path}'.")

    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_and_update_data, 'interval', hours=1, id='hourly_fetch_job')
    scheduler.start()
    print("Hourly data fetch scheduler started.")
    print(f"Flask static folder set to: {app.static_folder}") # Confirm static folder path
    app.run(debug=True, port=5000, use_reloader=False)





# # main.py
# from flask import Flask, request, jsonify, send_from_directory
# from flask_cors import CORS
# import json
# import os
# import pandas as pd
# from apscheduler.schedulers.background import BackgroundScheduler

# # --- Import your logic functions ---
# from models.classification import predict_water_quality, features as classification_features
# from update_pipeline import fetch_and_update_data

# # --- CONFIGURATION ---
# STATIC_DIR = "static"
# DAILY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/daily")
# WEEKLY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/weekly")
# DAYNIGHT_DIR = os.path.join(STATIC_DIR, "daynight")
# LOCATIONS_CSV_PATH = "data/cpcb_station_locations.csv"
# # --- (NEW) Path to the single JSON heatmap ---
# ANOMALY_PLOT_PATH = os.path.join(STATIC_DIR, "anomaly/anomaly_heatmap.json") 
# CORRELATION_DIR = os.path.join(STATIC_DIR, "correlation")
# DAILY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/daily_summary_predictions.json")
# WEEKLY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/weekly_summary_predictions.json")
# WEEKLY_DETAILS_DIR = os.path.join(STATIC_DIR, "predictions/weekly_details")

# # --- FLASK APP SETUP ---
# # --- (MODIFIED) Added static_folder='static' ---
# # This lets your frontend request images like /static/daynight/station_123.png
# app = Flask(__name__, static_folder='static')
# CORS(app)  # Allows your frontend to talk to this server

# # --- 1. LIVE PREDICTION API ---
# @app.route('/api/classify', methods=['POST'])
# def handle_classification():
#     """
#     Endpoint for live classification from user input.
#     """
#     user_input = request.json
#     result = predict_water_quality(user_input)
    
#     if result['status'] == 'error':
#         print(f"🔴 ERROR IN /api/classify: {result.get('message', 'Unknown error')}")
#         return jsonify(result), 400
        
#     return jsonify(result)

# # --- 2. PRE-GENERATED PLOT APIs ---
# @app.route('/api/predictions/daily/<station_id>', methods=['GET'])
# def get_daily_prediction(station_id):
#     """
#     Fetches the pre-generated daily prediction JSON for a station.
#     """
#     plot_path = os.path.join(DAILY_PRED_DIR, f"daily_pred_station_{station_id}.json")
#     if not os.path.exists(plot_path):
#         return jsonify({"error": "Prediction plot not found for this station."}), 404
    
#     try:
#         with open(plot_path, 'r') as f:
#             return json.load(f)
#     except Exception as e:
#         return jsonify({"error": f"Failed to read plot file: {e}"}), 500

# @app.route('/api/predictions/weekly/<station_id>', methods=['GET'])
# def get_weekly_prediction(station_id):
#     """
#     Fetches the pre-generated weekly prediction JSON for a station.
#     """
#     plot_path = os.path.join(WEEKLY_PRED_DIR, f"weekly_pred_station_{station_id}.json")
#     if not os.path.exists(plot_path):
#         return jsonify({"error": "Prediction plot not found for this station."}), 404
    
#     try:
#         with open(plot_path, 'r') as f:
#             return json.load(f)
#     except Exception as e:
#         return jsonify({"error": f"Failed to read plot file: {e}"}), 500

# # --- (NEW) Correct endpoint for the Anomaly Heatmap ---
# @app.route('/api/anomaly-heatmap', methods=['GET'])
# def get_anomaly_map():
#     """
#     Fetches the pre-generated anomaly heatmap JSON.
#     """
#     if not os.path.exists(ANOMALY_PLOT_PATH):
#         # This 404 error is what you were seeing. 
#         # Run 'python run_all_batch_jobs.py' to create the file.
#         return jsonify({"error": "Anomaly heatmap JSON file not found."}), 404
        
#     try:
#         with open(ANOMALY_PLOT_PATH, 'r') as f:
#             return json.load(f)
#     except Exception as e:
#         return jsonify({"error": f"Failed to read heatmap file: {e}"}), 500
        

# # --- 3. STATIC FILE ENDPOINTS (for Day/Night PNGs) ---

# # This helper endpoint tells the frontend WHICH plots are available.
# @app.route('/api/daynight/list', methods=['GET'])
# def list_daynight_plots():
#     """
#     Returns a list of available day/night plot filenames.
#     """
#     try:
#         files = [f for f in os.listdir(DAYNIGHT_DIR) if f.endswith(".png")]
#         return jsonify(files)
#     except FileNotFoundError:
#         return jsonify({"error": "Day/Night plot directory not found."}), 404
    
# @app.route('/api/predictions/summary/daily', methods=['GET'])
# def get_daily_summary():
#     """
#     Fetches the pre-generated summary table of all daily predictions.
#     """
#     if not os.path.exists(DAILY_SUMMARY_PATH):
#         return jsonify({"error": "Daily summary file not found. Run batch jobs."}), 404
#     try:
#         with open(DAILY_SUMMARY_PATH, 'r') as f:
#             return json.load(f) # Returns a list of objects
#     except Exception as e:
#         return jsonify({"error": f"Failed to read file: {e}"}), 500

# @app.route('/api/predictions/summary/weekly', methods=['GET'])
# def get_weekly_summary():
#     """
#     Fetches the pre-generated summary table of all weekly predictions.
#     """
#     if not os.path.exists(WEEKLY_SUMMARY_PATH):
#         return jsonify({"error": "Weekly summary file not found. Run batch jobs."}), 404
#     try:
#         with open(WEEKLY_SUMMARY_PATH, 'r') as f:
#             return json.load(f) # Returns a list of objects
#     except Exception as e:
#         return jsonify({"error": f"Failed to read file: {e}"}), 500

# @app.route('/api/predictions/weekly_details/<station_id>', methods=['GET'])
# def get_weekly_details(station_id):
#     """
#     Fetches the pre-generated detailed 7-day table for a station.
#     """
#     plot_path = os.path.join(WEEKLY_DETAILS_DIR, f"weekly_details_station_{station_id}.json")
#     if not os.path.exists(plot_path):
#         return jsonify({"error": "Weekly details file not found for this station."}), 404
#     try:
#         with open(plot_path, 'r') as f:
#             return json.load(f) # Returns a JSON object {"Day 1": {...}, "Avg": {...}}
#     except Exception as e:
#         return jsonify({"error": f"Failed to read file: {e}"}), 500
    
# # --- (NEW) Correlation Heatmap Endpoint ---        
# @app.route('/api/correlation/<station_id>', methods=['GET'])
# def get_correlation_plot(station_id):
#     """
#     Fetches the pre-generated correlation heatmap JSON for a station.
#     """
#     plot_path = os.path.join(CORRELATION_DIR, f"correlation_station_{station_id}.json")
#     if not os.path.exists(plot_path):
#         return jsonify({"error": "Correlation plot not found for this station."}), 404
    
#     try:
#         with open(plot_path, 'r') as f:
#             return json.load(f)
#     except Exception as e:
#         return jsonify({"error": f"Failed to read correlation file: {e}"}), 500
        
# # --- START THE SCHEDULER & APP ---
# if __name__ == '__main__':
#     # 1. Start the hourly scheduler
#     scheduler = BackgroundScheduler()
#     scheduler.add_job(fetch_and_update_data, 'interval', hours=1, id='hourly_fetch_job')
#     scheduler.start()
#     print("Hourly data fetch scheduler started.")
    
#     # 2. Run the Flask app
#     # use_reloader=False is important so the scheduler doesn't run twice
#     app.run(debug=True, port=5000, use_reloader=False)