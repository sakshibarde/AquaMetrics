# run_all_batch_jobs.py
import time
from models.daynight_analysis import run_day_night_analysis
from models.anomaly_detection import run_anomaly_detection
from models.predictions import create_daily_prediction_plots, create_weekly_prediction_plots
from models.correlation_analysis import run_correlation_analysis # <-- (NEW) IMPORT

if __name__ == "__main__":
    start_time = time.time()
    print("--- 🚀 Starting All Daily Batch Jobs ---")
    
    # run_day_night_analysis()
    run_anomaly_detection()
    # create_daily_prediction_plots()
    # create_weekly_prediction_plots()
    # run_correlation_analysis() # <-- (NEW) ADD TO LIST
    
    end_time = time.time()
    print(f"--- ✅ All Daily Batch Jobs Complete (Total time: {end_time - start_time:.2f}s) ---")