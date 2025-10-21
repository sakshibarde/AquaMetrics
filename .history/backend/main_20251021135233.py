






# main.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler

# --- Import your logic functions ---
from models.classification import predict_water_quality, features as classification_features
from update_pipeline import fetch_and_update_data

# --- CONFIGURATION ---
STATIC_DIR = "static"
DAILY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/daily")
WEEKLY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/weekly")
DAYNIGHT_DIR = os.path.join(STATIC_DIR, "daynight")
LOCATIONS_CSV_PATH = "data/cpcb_station_locations.csv"
# --- (NEW) Path to the single JSON heatmap ---
ANOMALY_PLOT_PATH = os.path.join(STATIC_DIR, "anomaly/anomaly_heatmap.json") 
CORRELATION_DIR = os.path.join(STATIC_DIR, "correlation")
DAILY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/daily_summary_predictions.json")
WEEKLY_SUMMARY_PATH = os.path.join(STATIC_DIR, "predictions/weekly_summary_predictions.json")
WEEKLY_DETAILS_DIR = os.path.join(STATIC_DIR, "predictions/weekly_details")

# --- FLASK APP SETUP ---
# --- (MODIFIED) Added static_folder='static' ---
# This lets your frontend request images like /static/daynight/station_123.png
app = Flask(__name__, static_folder='static')
CORS(app)  # Allows your frontend to talk to this server

# --- 1. LIVE PREDICTION API ---
@app.route('/api/classify', methods=['POST'])
def handle_classification():
    """
    Endpoint for live classification from user input.
    """
    user_input = request.json
    result = predict_water_quality(user_input)
    
    if result['status'] == 'error':
        print(f"🔴 ERROR IN /api/classify: {result.get('message', 'Unknown error')}")
        return jsonify(result), 400
        
    return jsonify(result)

# --- 2. PRE-GENERATED PLOT APIs ---
@app.route('/api/predictions/daily/<station_id>', methods=['GET'])
def get_daily_prediction(station_id):
    """
    Fetches the pre-generated daily prediction JSON for a station.
    """
    plot_path = os.path.join(DAILY_PRED_DIR, f"daily_pred_station_{station_id}.json")
    if not os.path.exists(plot_path):
        return jsonify({"error": "Prediction plot not found for this station."}), 404
    
    try:
        with open(plot_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        return jsonify({"error": f"Failed to read plot file: {e}"}), 500

@app.route('/api/predictions/weekly/<station_id>', methods=['GET'])
def get_weekly_prediction(station_id):
    """
    Fetches the pre-generated weekly prediction JSON for a station.
    """
    plot_path = os.path.join(WEEKLY_PRED_DIR, f"weekly_pred_station_{station_id}.json")
    if not os.path.exists(plot_path):
        return jsonify({"error": "Prediction plot not found for this station."}), 404
    
    try:
        with open(plot_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        return jsonify({"error": f"Failed to read plot file: {e}"}), 500

# --- (NEW) Correct endpoint for the Anomaly Heatmap ---
@app.route('/api/anomaly-heatmap', methods=['GET'])
def get_anomaly_map():
    """
    Fetches the pre-generated anomaly heatmap JSON.
    """
    if not os.path.exists(ANOMALY_PLOT_PATH):
        # This 404 error is what you were seeing. 
        # Run 'python run_all_batch_jobs.py' to create the file.
        return jsonify({"error": "Anomaly heatmap JSON file not found."}), 404
        
    try:
        with open(ANOMALY_PLOT_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        return jsonify({"error": f"Failed to read heatmap file: {e}"}), 500
        

# --- 3. STATIC FILE ENDPOINTS (for Day/Night PNGs) ---

# This helper endpoint tells the frontend WHICH plots are available.
@app.route('/api/daynight/list', methods=['GET'])
def list_daynight_plots():
    """
    Returns a list of available day/night plot filenames.
    """
    try:
        files = [f for f in os.listdir(DAYNIGHT_DIR) if f.endswith(".png")]
        return jsonify(files)
    except FileNotFoundError:
        return jsonify({"error": "Day/Night plot directory not found."}), 404
    
@app.route('/api/predictions/summary/daily', methods=['GET'])
def get_daily_summary():
    """
    Fetches the pre-generated summary table of all daily predictions.
    """
    if not os.path.exists(DAILY_SUMMARY_PATH):
        return jsonify({"error": "Daily summary file not found. Run batch jobs."}), 404
    try:
        with open(DAILY_SUMMARY_PATH, 'r') as f:
            return json.load(f) # Returns a list of objects
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 500

@app.route('/api/predictions/summary/weekly', methods=['GET'])
def get_weekly_summary():
    """
    Fetches the pre-generated summary table of all weekly predictions.
    """
    if not os.path.exists(WEEKLY_SUMMARY_PATH):
        return jsonify({"error": "Weekly summary file not found. Run batch jobs."}), 404
    try:
        with open(WEEKLY_SUMMARY_PATH, 'r') as f:
            return json.load(f) # Returns a list of objects
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 500

@app.route('/api/predictions/weekly_details/<station_id>', methods=['GET'])
def get_weekly_details(station_id):
    """
    Fetches the pre-generated detailed 7-day table for a station.
    """
    plot_path = os.path.join(WEEKLY_DETAILS_DIR, f"weekly_details_station_{station_id}.json")
    if not os.path.exists(plot_path):
        return jsonify({"error": "Weekly details file not found for this station."}), 404
    try:
        with open(plot_path, 'r') as f:
            return json.load(f) # Returns a JSON object {"Day 1": {...}, "Avg": {...}}
    except Exception as e:
        return jsonify({"error": f"Failed to read file: {e}"}), 500
    
# --- (NEW) Correlation Heatmap Endpoint ---        
@app.route('/api/correlation/<station_id>', methods=['GET'])
def get_correlation_plot(station_id):
    """
    Fetches the pre-generated correlation heatmap JSON for a station.
    """
    plot_path = os.path.join(CORRELATION_DIR, f"correlation_station_{station_id}.json")
    if not os.path.exists(plot_path):
        return jsonify({"error": "Correlation plot not found for this station."}), 404
    
    try:
        with open(plot_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        return jsonify({"error": f"Failed to read correlation file: {e}"}), 500
        
# --- START THE SCHEDULER & APP ---
if __name__ == '__main__':
    # 1. Start the hourly scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(fetch_and_update_data, 'interval', hours=1, id='hourly_fetch_job')
    scheduler.start()
    print("Hourly data fetch scheduler started.")
    
    # 2. Run the Flask app
    # use_reloader=False is important so the scheduler doesn't run twice
    app.run(debug=True, port=5000, use_reloader=False)