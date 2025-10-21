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
import pandas as pd
import sqlite3
import os

# --- CONFIGURE THESE PATHS ---
DB_PATH = "database/water_quality.db"
TABLE_NAME = "water_records"
NEW_DATA_PATH = "C:\Users\hp\Downloads\hydro-predicta-flow-main\backend\data\preprocessed_combined_station_data.csv"  # your new version containing all data

def replace_database_with_new_data():
    print("--- Starting Full Database Replacement ---")

    if not os.path.exists(NEW_DATA_PATH):
        print(f"❌ ERROR: New CSV file not found at: {NEW_DATA_PATH}")
        return

    print(f"📥 Reading new dataset: {NEW_DATA_PATH}")
    new_df = pd.read_csv(NEW_DATA_PATH)

    if new_df.empty:
        print("⚠️ ERROR: New dataset is empty. Aborting.")
        return

    # Connect to the SQLite database
    con = sqlite3.connect(DB_PATH)

    print(f"💾 Replacing table '{TABLE_NAME}' with {len(new_df)} rows...")
    new_df.to_sql(TABLE_NAME, con, if_exists='replace', index=False)

    con.close()
    print("✅ Database successfully replaced with new version!")

if __name__ == "__main__":
    replace_database_with_new_data()
