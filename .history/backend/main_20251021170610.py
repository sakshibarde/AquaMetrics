# main.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import sqlite3 # <-- Make sure this is imported
import pandas as pd # <-- Make sure this is imported
from apscheduler.schedulers.background import BackgroundScheduler

# --- Import your logic functions ---
# --- (MODIFIED) Import the features list too ---
from models.classification import predict_water_quality, features as classification_features
from update_pipeline import fetch_and_update_data

# --- CONFIGURATION ---
DB_PATH = "database/water_quality.db" # <-- Add DB Path
TABLE_NAME = "water_records"         # <-- Add Table Name
# --- (NEW) Path to your locations CSV ---
LOCATIONS_CSV_PATH = "data/cpcb_station_locations.csv" # <-- Make sure this path is correct
STATIC_DIR = "static"
DAILY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/daily")
WEEKLY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/weekly")
DAYNIGHT_DIR = os.path.join(STATIC_DIR, "daynight")
ANOMALY_PLOT_PATH = os.path.join(STATIC_DIR, "anomaly/anomaly_heatmap.json")
CORRELATION_DIR = os.path.join(STATIC_DIR, "correlation")
WEEKLY_DETAILS_DIR = os.path.join(STATIC_DIR, "predictions/weekly_details")
DAILY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/daily_summary_predictions.json")
WEEKLY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/weekly_summary_predictions.json")

# --- FLASK APP SETUP ---
app = Flask(__name__, static_folder='static')
CORS(app)

# --- (NEW) Endpoint to get Station List with Quality & Real Locations ---
@app.route('/api/stations', methods=['GET'])
def get_stations():
    """
    Fetches the latest record for each station, runs classification,
    loads real location data from CSV, and returns a merged list.
    """
    # --- 1. Load Location Data from CSV ---
    try:
        locations_df = pd.read_csv(LOCATIONS_CSV_PATH)
        # Select and rename columns for clarity
        locations_df = locations_df[['station_id', 'station_name', 'latitude', 'longitude', 'state']].rename(columns={
            'station_id': 'stationId', # Ensure the join column name matches
            'station_name': 'name',
            'latitude': 'lat',
            'longitude': 'lng',
            'state': 'location' # Use 'state' as the location string
        })
        # Ensure stationId is integer for joining
        locations_df['stationId'] = locations_df['stationId'].astype(int)
    except Exception as e:
        print(f"🔴 ERROR loading locations CSV '{LOCATIONS_CSV_PATH}': {e}")
        return jsonify({"error": "Failed to load station location data."}), 500

    # --- 2. Load Latest Water Quality Data from DB ---
    try:
        con = sqlite3.connect(DB_PATH)
        # Query to get the most recent record for each stationId
        # IMPORTANT: Use the actual timestamp column name from your DB (e.g., 'timestamp' or 'timestampDate')
        query = f"""
        SELECT t1.*
        FROM {TABLE_NAME} t1
        INNER JOIN (
            SELECT stationId, MAX(timestampDate) as MaxTimestamp -- Use correct timestamp column
            FROM {TABLE_NAME}
            GROUP BY stationId
        ) t2 ON t1.stationId = t2.stationId AND t1.timestampDate = t2.MaxTimestamp -- Use correct timestamp column
        """
        latest_df = pd.read_sql_query(query, con)
        # Ensure stationId is integer for joining
        latest_df['stationId'] = latest_df['stationId'].astype(int)
    except Exception as e:
        print(f"🔴 ERROR fetching latest station data: {e}")
        return jsonify({"error": "Failed to fetch station data from database."}), 500
    finally:
        con.close()

    if latest_df.empty:
        print("🟡 WARNING: No recent station data found in database for quality check.")
        # Return only location data if DB is empty but CSV loaded
        # Add a default 'Medium' quality
        locations_df['quality'] = 'Medium'
        return jsonify(locations_df.to_dict('records'))


    # --- 3. Classify Latest Data ---
    classified_qualities = {}
    for index, row in latest_df.iterrows():
        station_id = int(row['stationId'])
        input_data = {}
        missing_features = []
        for feature in classification_features: # Use the imported features list
            if feature in row and pd.notna(row[feature]):
                input_data[feature] = row[feature]
            else:
                input_data[feature] = 0 # Defaulting missing to 0 (consider improving this later)
                missing_features.append(feature)

        if missing_features:
             print(f"⚠️ Station {station_id}: Using defaults for missing classification features: {', '.join(missing_features)}")

        # Run prediction
        quality_result = predict_water_quality(input_data)

        if quality_result['status'] == 'success':
            classified_qualities[station_id] = quality_result['class']
        else:
            classified_qualities[station_id] = 'Medium' # Default quality if prediction fails
            print(f"⚠️ Failed to classify station {station_id}: {quality_result.get('message')}")

    # --- 4. Merge Location Data with Quality Data ---
    # Add the 'quality' column to the locations dataframe based on the classified results
    locations_df['quality'] = locations_df['stationId'].map(classified_qualities)
    # Fill any stations that were in the CSV but NOT in the latest DB data with a default
    locations_df['quality'] = locations_df['quality'].fillna('Medium')

    # Filter out stations from the CSV that don't exist in the database's latest records, if desired
    # Or keep them with default 'Medium' quality as done above
    final_station_list = locations_df[locations_df['stationId'].isin(latest_df['stationId'].unique())].to_dict('records')

    # Alternatively, to include all stations from the CSV:
    # final_station_list = locations_df.to_dict('records')
    # --- ADD THIS DEBUG PRINT ---
    if final_station_list:
        print("\n--- DEBUG: First station object being sent: ---")
        print(final_station_list[0])
        print("--------------------------------------------\n")
    else:
        print("\n--- DEBUG: final_station_list is empty! ---\n")
    # ----------------------------
    return jsonify(final_station_list)


# --- 1. LIVE PREDICTION API ---
@app.route('/api/classify', methods=['POST'])
def handle_classification():
    user_input = request.json
    result = predict_water_quality(user_input)
    if result['status'] == 'error':
        print(f"🔴 ERROR IN /api/classify: {result.get('message', 'Unknown error')}")
        return jsonify(result), 400
    return jsonify(result)

# --- 2. PRE-GENERATED PLOT APIs ---
@app.route('/api/correlation/<station_id>', methods=['GET'])
def get_correlation_plot(station_id):
    """
    Fetches the pre-generated correlation heatmap JSON for a station,
    based on the requested method (pearson, spearman, kendall).
    Defaults to spearman if method is not provided or invalid.
    """
    # --- (MODIFIED) Get method from query param ---
    method = request.args.get('method', 'spearman').lower()
    if method not in ['pearson', 'spearman', 'kendall']:
        method = 'spearman' # Default to spearman if invalid
    # --- (END MODIFIED) ---

    # --- (MODIFIED) Construct filename with method ---
    filename = f"correlation_station_{station_id}_{method}.json"
    plot_path = os.path.join(CORRELATION_DIR, filename)
    # --- (END MODIFIED) ---

    if not os.path.exists(plot_path):
        return jsonify({"error": f"Correlation plot ({method}) not found for this station."}), 404

    try:
        with open(plot_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        return jsonify({"error": f"Failed to read correlation file: {e}"}), 500

@app.route('/api/predictions/weekly/<station_id>', methods=['GET'])
def get_weekly_prediction(station_id):
    plot_path = os.path.join(WEEKLY_PRED_DIR, f"weekly_pred_station_{station_id}.json")
    if not os.path.exists(plot_path): return jsonify({"error": "Plot not found."}), 404
    try:
        with open(plot_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500

@app.route('/api/predictions/weekly_details/<station_id>', methods=['GET'])
def get_weekly_details(station_id):
    plot_path = os.path.join(WEEKLY_DETAILS_DIR, f"weekly_details_station_{station_id}.json")
    if not os.path.exists(plot_path): return jsonify({"error": "Details not found."}), 404
    try:
        with open(plot_path, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500


@app.route('/api/predictions/summary/daily', methods=['GET'])
def get_daily_summary():
    if not os.path.exists(DAILY_SUMMARY_PATH): return jsonify({"error": "File not found."}), 404
    try:
        with open(DAILY_SUMMARY_PATH, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500


@app.route('/api/predictions/summary/weekly', methods=['GET'])
def get_weekly_summary():
    if not os.path.exists(WEEKLY_SUMMARY_PATH): return jsonify({"error": "File not found."}), 404
    try:
        with open(WEEKLY_SUMMARY_PATH, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500


@app.route('/api/anomaly-heatmap', methods=['GET'])
def get_anomaly_map():
    if not os.path.exists(ANOMALY_PLOT_PATH): return jsonify({"error": "File not found."}), 404
    try:
        with open(ANOMALY_PLOT_PATH, 'r') as f: return json.load(f)
    except Exception as e: return jsonify({"error": f"Read error: {e}"}), 500


# --- 3. STATIC FILE ENDPOINTS ---
@app.route('/api/daynight/list', methods=['GET'])
def list_daynight_plots():
    try:
        files = [f for f in os.listdir(DAYNIGHT_DIR) if f.endswith(".png")]
        return jsonify(files)
    except FileNotFoundError:
        return jsonify({"error": "Directory not found."}), 404

# --- START THE SCHEDULER & APP ---
if __name__ == '__main__':
    # Check if locations CSV exists on startup
    if not os.path.exists(LOCATIONS_CSV_PATH):
        print(f"🚨 WARNING: Location file not found at '{LOCATIONS_CSV_PATH}'. Map data will use defaults or be incomplete.")

    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_and_update_data, 'interval', hours=1, id='hourly_fetch_job')
    scheduler.start()
    print("Hourly data fetch scheduler started.")
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