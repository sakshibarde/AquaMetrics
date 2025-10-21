# # main.py
# from flask import Flask, request, jsonify, send_from_directory
# from flask_cors import CORS
# import json
# import os
# from apscheduler.schedulers.background import BackgroundScheduler

# # --- Import your logic functions ---
# from models.classification import predict_water_quality
# from update_pipeline import fetch_and_update_data # The hourly job

# # --- CONFIGURATION ---
# STATIC_DIR = "static"
# DAILY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/daily")
# WEEKLY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/weekly")
# ANOMALY_DIR = os.path.join(STATIC_DIR, "anomaly")
# DAYNIGHT_DIR = os.path.join(STATIC_DIR, "daynight")

# # --- FLASK APP SETUP ---
# app = Flask(__name__)
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
    
#     with open(plot_path, 'r') as f:
#         return json.load(f)

# @app.route('/api/predictions/weekly/<station_id>', methods=['GET'])
# def get_weekly_prediction(station_id):
#     """
#     Fetches the pre-generated weekly prediction JSON for a station.
#     """
#     plot_path = os.path.join(WEEKLY_PRED_DIR, f"weekly_pred_station_{station_id}.json")
#     if not os.path.exists(plot_path):
#         return jsonify({"error": "Prediction plot not found for this station."}), 404
    
#     with open(plot_path, 'r') as f:
#         return json.load(f)

# # --- 3. STATIC FILE ENDPOINTS (for PNGs) ---
# # Flask serves the 'static' folder by default.
# # Your frontend can directly request:
# # <img src="http://localhost:5000/static/daynight/station_123.png">
# # <img src="http://localhost:5000/static/anomaly/anomaly_plot_xyz.png">

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
        
# @app.route('/api/anomaly/list', methods=['GET'])
# def list_anomaly_plots():
#     """
#     Returns a list of available anomaly plot filenames.
#     """
#     try:
#         files = [f for f in os.listdir(ANOMALY_DIR) if f.endswith(".png")]
#         return jsonify(files)
#     except FileNotFoundError:
#         return jsonify({"error": "Anomaly plot directory not found."}), 404
        
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






# main.py
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from apscheduler.schedulers.background import BackgroundScheduler

# --- Import your logic functions ---
from models.classification import predict_water_quality
from update_pipeline import fetch_and_update_data # The hourly job

# --- CONFIGURATION ---
STATIC_DIR = "static"
DAILY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/daily")
WEEKLY_PRED_DIR = os.path.join(STATIC_DIR, "predictions/weekly")
DAYNIGHT_DIR = os.path.join(STATIC_DIR, "daynight")
# --- (NEW) Path to the single JSON heatmap ---
ANOMALY_PLOT_PATH = os.path.join(STATIC_DIR, "anomaly/anomaly_heatmap.json") 
CORRELATION_DIR = os.path.join(STATIC_DIR, "correlation")

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