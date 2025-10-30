# # import_old_data.py
# import pandas as pd
# import sqlite3
# import os

# # --- !!! YOU MUST CHANGE THIS PATH !!! ---
# # This must be the full path to your *single, already-cleaned* CSV file.
# CLEAN_CSV_FILE_PATH = "C:\\Users\\hp\\Downloads\\hydro-predicta-flow-main\\backend\\data\\preprocessed_combined_station_data.csv"

# # --- Database Settings ---
# DB_PATH = 'database/water_quality.db'
# TABLE_NAME = 'water_records'

# def run_import_from_clean_csv():
#     print("--- Starting One-Time Import from Clean CSV ---")
#     if not os.path.exists(CLEAN_CSV_FILE_PATH):
#         print(f"🔴 ERROR: File not found at: {CLEAN_CSV_FILE_PATH}")
#         return
    
#     print(f"Reading clean file: {CLEAN_CSV_FILE_PATH}")
#     clean_df = pd.read_csv(CLEAN_CSV_FILE_PATH)
    
#     if clean_df.empty:
#         print("🔴 ERROR: Cleaned CSV file is empty. Aborting.")
#         return

#     con = sqlite3.connect(DB_PATH)
#     print(f"Saving {len(clean_df)} clean historical rows to table '{TABLE_NAME}'...")
#     clean_df.to_sql(TABLE_NAME, con, if_exists='replace', index=False)
#     con.close()
#     print(f"✅ Success! Database '{DB_PATH}' is created.")

# if __name__ == "__main__":
#     run_import_from_clean_csv()



# replace_with_new_data.py
# File: convert_csv_to_db.py
# Place this file in your main project folder (hydro-predicta-flow-main) and run it once.

import pandas as pd
import sqlite3
import os

# --- 1. YOUR CSV FILE PATH ---
# This is the path you provided.
CSV_FILE_PATH = r"C:\Users\hp\Downloads\hydro-predicta-flow-main\backend\data\preprocessed_combined_station_data.csv"

# --- 2. YOUR DATABASE OUTPUT PATH ---
# This is the correct path for your backend application.
DB_FILE_PATH = 'backend/database/water_quality.db'

# --- 3. YOUR TABLE NAME ---
TABLE_NAME = 'water_records'

def convert_csv_to_sqlite():
    print("--- Starting One-Time CSV to DB Conversion ---")
    
    # Check if the CSV file exists
    if not os.path.exists(CSV_FILE_PATH):
        print(f"🔴 ERROR: CSV file not found at: {CSV_FILE_PATH}")
        print("Please check the path and try again.")
        return

    print(f"Reading data from {CSV_FILE_PATH}...")
    try:
        # Read your clean CSV
        df = pd.read_csv(CSV_FILE_PATH)
    except Exception as e:
        print(f"🔴 ERROR: Could not read CSV file. {e}")
        return

    if df.empty:
        print("🔴 ERROR: Your CSV file is empty. Aborting.")
        return

    print(f"Successfully read {len(df)} rows.")
    
    # Ensure the database directory (backend/database) exists
    db_dir = os.path.dirname(DB_FILE_PATH)
    os.makedirs(db_dir, exist_ok=True)
    print(f"Ensured database directory exists: {db_dir}")

    try:
        # Connect to the SQLite database (this will create it if it doesn't exist)
        conn = sqlite3.connect(DB_FILE_PATH)
        
        print(f"Writing data to table '{TABLE_NAME}' in {DB_FILE_PATH}...")
        
        # This command replaces the entire 'water_records' table with your CSV data
        df.to_sql(
            TABLE_NAME, 
            conn, 
            if_exists='replace',  # This drops any old, bad table
            index=False           # Don't save the pandas (0, 1, 2...) index
        )
        
        print("✅ Success! Your new database has been created.")
        print("You can now verify the file in DB Browser and then push it to GitHub.")
        
    except Exception as e:
        print(f"🔴 ERROR: Could not write to database. {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    convert_csv_to_sqlite()
