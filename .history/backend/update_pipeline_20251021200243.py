# backend/update_pipeline.py
import pandas as pd
import numpy as np
import sqlite3
import json
import os
from datetime import datetime

# --- Configuration (using absolute paths relative to this script) ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR) # Assumes update_pipeline.py is directly in backend/

DB_PATH = os.path.join(BACKEND_DIR, "database/water_quality.db")
TABLE_NAME = "water_records"
# Path to the JSON file created by the scraper
SCRAPED_DATA_JSON = os.path.join(BACKEND_DIR, "static/scraped_data/latest_cpcb_data.json")

def preprocess_and_store_data():
    """
    Reads the latest scraped JSON data, preprocesses it, and stores it in the SQLite DB.
    """
    print("--- Starting Database Update Pipeline ---")

    # --- 1. Read Scraped JSON Data ---
    print(f"Reading scraped data from: {SCRAPED_DATA_JSON}")
    try:
        with open(SCRAPED_DATA_JSON, 'r') as f:
            data = json.load(f)
        if not data:
            print("🟡 Scraped data file is empty. No data to update.")
            return
        df = pd.DataFrame(data)
        print(f"Loaded {len(df)} records from JSON.")
    except FileNotFoundError:
        print(f"🔴 ERROR: Scraped data file not found at {SCRAPED_DATA_JSON}. Cannot update database.")
        return
    except json.JSONDecodeError:
        print(f"🔴 ERROR: Scraped data file is not valid JSON: {SCRAPED_DATA_JSON}")
        return
    except Exception as e:
        print(f"🔴 ERROR: Failed to read or parse JSON file: {e}")
        return

    # --- 2. Preprocess Data ---
    print("Preprocessing data...")
    # Ensure stationId is present and convert to integer (if possible, handle errors)
    if 'stationId' not in df.columns:
        print("🔴 ERROR: 'stationId' column missing in scraped data.")
        return
    try:
        # Attempt conversion, keep original if error (might indicate string IDs)
        df['stationId'] = pd.to_numeric(df['stationId'], errors='ignore')
    except Exception as e:
         print(f"Warning: Could not reliably convert 'stationId' to numeric: {e}")


    # Ensure timestamp column exists and convert to datetime objects
    if 'timestamp' not in df.columns:
        print("🔴 ERROR: 'timestamp' column missing in scraped data.")
        return
    try:
        # Assuming timestamp is like 'YYYY-MM-DD HH:MM:SS' from scraper
        df['timestampDate'] = pd.to_datetime(df['timestamp'], errors='coerce')
    except Exception as e:
        print(f"🔴 ERROR converting 'timestamp' column: {e}")
        df['timestampDate'] = pd.NaT # Set to NaT on error

    df = df.dropna(subset=['stationId', 'timestampDate']) # Drop rows with invalid ID or timestamp
    if df.empty:
         print("🟡 No valid records remaining after preprocessing timestamp/stationId.")
         return

    # Convert parameter columns to numeric, coercing errors to NaN
    # Identify parameter columns (assuming they are all others except metadata)
    meta_cols = ['stationId', 'stationName', 'location', 'timestamp', 'timestampDate', 'id'] # Add others if present
    param_cols = [col for col in df.columns if col not in meta_cols]
    print(f"Identified parameter columns: {param_cols}")
    for col in param_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Keep only necessary columns for the database
    db_cols = ['stationId', 'timestampDate'] + param_cols
    df_to_store = df[[col for col in db_cols if col in df.columns]].copy() # Ensure columns exist

    # --- 3. Store Data in SQLite Database ---
    print(f"Connecting to database: {DB_PATH}")
    added_count = 0
    updated_count = 0
    try:
        with sqlite3.connect(DB_PATH) as con:
            cur = con.cursor()
            # Create table if it doesn't exist (Add all potential param_cols)
            # Use "REAL" for numeric types which allows NULLs
            cols_sql = ", ".join([f'"{col}" REAL' for col in param_cols])
            create_table_sql = f"""
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                stationId INTEGER,
                timestampDate TIMESTAMP,
                {cols_sql},
                PRIMARY KEY (stationId, timestampDate)
            );
            """
            cur.execute(create_table_sql)

            # Insert or Replace data
            # Use 'replace' to overwrite if primary key (stationId, timestampDate) exists
            # Note: This assumes scraped data IS the latest for that timestamp.
            # If combining historical + scraped, 'ignore' might be safer.
            print(f"Inserting/updating {len(df_to_store)} records into '{TABLE_NAME}'...")
            df_to_store.to_sql(TABLE_NAME, con, if_exists='append', index=False)
            # Note: to_sql with if_exists='append' doesn't easily report added/updated.
            # For exact counts, manual INSERT OR REPLACE loop would be needed.
            added_count = len(df_to_store) # Approximate count


    except sqlite3.Error as e:
        print(f"🔴 ERROR: Database error: {e}")
        # Consider specific error handling (e.g., IntegrityError for duplicates if not using REPLACE)
    except Exception as e:
        print(f"🔴 ERROR: Failed to store data in database: {e}")

    print(f"Database update complete. Approximately {added_count} records processed.")
    print("--- Database Update Pipeline Finished ---")

# Allow running this script directly
if __name__ == "__main__":
    preprocess_and_store_data()