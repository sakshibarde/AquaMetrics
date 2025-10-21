# update_pipeline.py
import pandas as pd
import sqlite3
from datetime import datetime
import os

# Import your processing functions
from models.preprocess import organize_records, clean_and_fill

LATEST_CSV_PATH = "data/latest.csv" # Path to the file from GitHub Actions
DB_PATH = "database/water_quality.db"
TABLE_NAME = "water_records"

def fetch_and_update_data():
    """
    Fetches the latest.csv, processes it, and appends to the database.
    """
    print(f"[{datetime.now()}] Running hourly data fetch...")
    
    # Check if the file exists
    if not os.path.exists(LATEST_CSV_PATH):
        print(f"Hourly fetch: 'data/latest.csv' not found. Skipping update.")
        return
        
    try:
        # 1. Read latest.csv
        raw_df = pd.read_csv(LATEST_CSV_PATH)
        
        # 2. Process it (Step 3: Organize)
        organized_df = organize_records(raw_df)
        
        # 3. Process it (Step 4: Clean)
        clean_df = clean_and_fill(organized_df)
        
        if clean_df.empty:
            print("Hourly fetch: No new valid data to add.")
            return
            
        # 4. Append to database
        con = sqlite3.connect(DB_PATH)
        clean_df.to_sql(TABLE_NAME, con, if_exists='append', index=False)
        con.close()
        
        print(f"✅ Success: Added {len(clean_df)} new rows to the database.")
        
    except Exception as e:
        print(f"🔴 ERROR during hourly update: {e}")