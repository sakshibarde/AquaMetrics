# import requests
# import pandas as pd
# import warnings
# from datetime import datetime

# # Suppress InsecureRequestWarning
# warnings.simplefilter("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)

# # Function to fetch data (SSL verification disabled)
# def fetch_data(url: str):
#     try:
#         response = requests.get(url, verify=False)  # Disabling SSL verification
#         if response.status_code == 200:
#             return response.json()
#         else:
#             print(f"Error {response.status_code}: {response.text}")
#             return []
#     except requests.exceptions.RequestException as e:
#         print(f"Request failed: {e}")
#         return []

# # Function to process and map data
# def process_data(data):
#     parameter_mapping = {
#         "River Stage": "Water Level",
#         "Oxygen, dissolved": "Dissolved Oxygen",
#     }
#     unit_mapping = {
#         "River Stage": "m above MSL",
#     }
#     processed_data = []
#     for dat in data:
#         # Handling timestamp format with milliseconds
#         timestamp = dat.get("timestamp", "")
#         timestamp_date = None
#         if timestamp:
#             try:
#                 timestamp_date = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ")  # Handling .000Z
#             except ValueError:
#                 try:
#                     timestamp_date = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")  # Fallback format
#                 except ValueError:
#                     print(f"Invalid timestamp format: {timestamp}")
#         processed_data.append({
#             "stationId": dat.get("station_id", ""),
#             "timestamp": timestamp,
#             "timestampDate": timestamp_date,
#             "value": dat.get("ts_value", ""),
#             "unit": unit_mapping.get(dat.get("stationparameter_longname", ""), dat.get("ts_unitsymbol", "")),
#             "parameterNo": dat.get("stationparameter_no", ""),
#             "parameterName": parameter_mapping.get(dat.get("stationparameter_longname", ""), dat.get("stationparameter_longname", ""))
#         })
#     return processed_data

# def main():
#     """Main function to fetch, process, and save data."""
#     url = "https://rtwqmsdb1.cpcb.gov.in/data/internet/layers/10/index.json"
#     raw_data = fetch_data(url)
    
#     if not raw_data:
#         print("No data fetched. Exiting.")
#         return

#     mapped_data = process_data(raw_data)
#     df = pd.DataFrame(mapped_data)

#     # --- MODIFICATION START ---
#     # Create a dynamic filename with the current date and time
#     timestamp_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
#     filename = f"water_data_{timestamp_str}.csv"
#     # --- MODIFICATION END ---

#     df.to_csv(filename, index=False)
#     print(f"Data saved successfully as '{filename}'!")

# if __name__ == "__main__":
#     main()


# cpcb_scraper.py
import requests
import pandas as pd
import numpy as np # Import numpy for NaN handling
import warnings
from datetime import datetime
import json # <-- Add json import
import os   # <-- Add os import

# Suppress InsecureRequestWarning
warnings.simplefilter("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)

# --- Define Output Path ---
# Assuming this script runs from the repository root in GitHub Actions
# Adjust if your directory structure is different
OUTPUT_DIR = "backend/static/scraped_data"
OUTPUT_JSON_FILE = os.path.join(OUTPUT_DIR, "latest_cpcb_data.json")
# Optional: Path to location data for merging names/states
LOCATIONS_CSV_PATH = "backend/data/cpcb_station_locations.csv"


# Function to fetch data (SSL verification disabled)
def fetch_data(url: str):
    """Fetches JSON data from the specified URL, disabling SSL verification."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    }
    try:
        response = requests.get(url, verify=False, timeout=60) # Increased timeout
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        print(f"Successfully fetched data from {url}")
        return response.json()
    except requests.exceptions.Timeout:
        print(f"🔴 ERROR: Request timed out fetching data from {url}.")
        return []
    except requests.exceptions.RequestException as e:
        print(f"🔴 ERROR: Request failed: {e}")
        return []

# Function to process raw data entries
def process_data(data):
    """Processes raw data entries, standardizes parameter names, and parses timestamps/values."""
    # Mapping for parameter names (from CPCB long name to desired column name)
    parameter_mapping = {
        "River Stage": "Water Level",
        "Oxygen, dissolved": "Dissolved Oxygen",
        "Temperature, water": "Water Temperature",
        "pH": "pH",
        "Turbidity": "Water Turbidity",
        "Ammonia": "Ammonia",
        "Nitrate": "Nitrate",
        "Conductivity": "Conductivity",
        "Biochemical Oxygen Demand (BOD)": "BOD",
        "Chemical Oxygen Demand (COD)": "COD",
        "Chloride": "Chloride", # Added based on Analysis.tsx logs
        "Total Organic Carbon": "Total Organic Carbon", # Added based on Analysis.tsx logs
        "Depth": "Depth" # Added based on Analysis.tsx logs
        # Add more mappings as discovered in CPCB data
    }
    # Mapping for specific units if needed (otherwise uses scraped unit)
    unit_mapping = {
        "River Stage": "m",
        "Temperature, water": "°C",
        "pH": "Unitless", # Example
        # Add others if necessary
    }
    processed_data = []
    print(f"Processing {len(data)} raw entries...")
    for dat in data:
        timestamp_str = dat.get("timestamp", "")
        parameter_long_name = dat.get("stationparameter_longname", "")
        # Standardize parameter name using mapping, fallback to original
        parameter_name = parameter_mapping.get(parameter_long_name, parameter_long_name)
        value_str = dat.get("ts_value", "")
        station_id_str = dat.get("station_id", "")

        # --- Timestamp Parsing ---
        timestamp_date = None
        if timestamp_str:
            try:
                timestamp_date = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ") # Try with milliseconds
            except ValueError:
                try:
                    timestamp_date = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%SZ") # Try without milliseconds
                except ValueError:
                    # print(f"Skipping invalid timestamp format: {timestamp_str}") # Reduce noise
                    continue # Skip record if timestamp is invalid
        else:
            continue # Skip if timestamp is missing

        # --- Value Parsing ---
        value = None
        if value_str is not None: # Check explicitly for None
            try:
                value = float(value_str)
            except (ValueError, TypeError):
                 # print(f"Skipping invalid value for {parameter_name} at station {station_id_str}: '{value_str}'") # Reduce noise
                 continue # Skip record if value is invalid (treat non-numeric as invalid for pivoting)
        else:
            continue # Skip if value is missing

        # --- Station ID Check ---
        if not station_id_str:
            continue # Skip if station ID is missing

        processed_data.append({
            "stationId": station_id_str, # Keep as string
            "timestampDate": timestamp_date, # Parsed datetime object
            "value": value, # Store as float
            "unit": unit_mapping.get(parameter_long_name, dat.get("ts_unitsymbol", "")),
            "parameterName": parameter_name # Use standardized name
        })
    print(f"Successfully processed {len(processed_data)} valid entries.")
    return processed_data

# Function to load location data from CSV
def load_location_data(filepath):
    """Loads station location details from a CSV file."""
    try:
        locations_df = pd.read_csv(filepath, dtype={'station_id': str}) # Read station_id as string
        locations_df = locations_df[['station_id', 'station_name', 'state']].rename(columns={
            'station_id': 'stationId',
            'station_name': 'stationName',
            'state': 'location'
        })
        # Ensure stationId is string type for merging
        locations_df['stationId'] = locations_df['stationId'].astype(str)
        print(f"Loaded {len(locations_df)} locations from {filepath}")
        return locations_df
    except FileNotFoundError:
        print(f"⚠️ Warning: Location file not found at {filepath}. Station names/locations will be missing.")
        return None
    except Exception as e:
        print(f"🔴 ERROR: Error loading location data from {filepath}: {e}")
        return None

def main():
    """Main function to fetch, process, pivot, merge, and save data."""
    url = "https://rtwqmsdb1.cpcb.gov.in/data/internet/layers/10/index.json"
    print(f"[{datetime.now()}] --- Starting CPCB Scraper ---")
    raw_data = fetch_data(url)

    if not raw_data:
        print("No data fetched. Exiting.")
        return

    mapped_data = process_data(raw_data)
    if not mapped_data:
        print("No data processed successfully. Exiting.")
        return

    df = pd.DataFrame(mapped_data)

    # --- Pivot the data ---
    print("Pivoting data to get latest value per station/parameter...")
    # Drop rows where essential columns might be missing after processing
    df = df.dropna(subset=['stationId', 'timestampDate', 'value', 'parameterName'])

    # Find the latest reading for each station-parameter pair
    # Sort by timestamp, then group and take the last entry
    latest_data = df.sort_values('timestampDate', ascending=True).groupby(['stationId', 'parameterName']).last().reset_index()

    # Pivot: stations as index, parameters as columns
    try:
        pivoted_df = latest_data.pivot(index='stationId', columns='parameterName', values='value')
    except Exception as e:
         print(f"🔴 ERROR: Pivoting failed: {e}")
         # Attempt to handle potential duplicate entries (though groupby.last should prevent this)
         print("Attempting pivot after dropping potential duplicates...")
         latest_data = latest_data.drop_duplicates(subset=['stationId', 'parameterName'], keep='last')
         try:
            pivoted_df = latest_data.pivot(index='stationId', columns='parameterName', values='value')
            print("Pivoting successful after dropping duplicates.")
         except Exception as e_inner:
            print(f"🔴 FATAL ERROR: Pivoting failed definitively: {e_inner}")
            return # Exit if pivoting fails

    pivoted_df = pivoted_df.reset_index() # Make stationId a column
    print(f"Pivoted data shape: {pivoted_df.shape}")

    # --- Add latest overall timestamp per station ---
    print("Adding latest timestamp per station...")
    latest_timestamps = latest_data.groupby('stationId')['timestampDate'].max().reset_index()
    # Format the timestamp string for JSON output
    latest_timestamps['timestamp'] = latest_timestamps['timestampDate'].dt.strftime('%Y-%m-%d %H:%M:%S')

    # Merge timestamp back into the pivoted data
    pivoted_df = pd.merge(pivoted_df, latest_timestamps[['stationId', 'timestamp']], on='stationId', how='left')

    # --- Merge location data ---
    print("Merging location data...")
    locations_df = load_location_data(LOCATIONS_CSV_PATH)
    if locations_df is not None:
         # Ensure stationId types are string for merging
         pivoted_df['stationId'] = pivoted_df['stationId'].astype(str)
         locations_df['stationId'] = locations_df['stationId'].astype(str)

         # Perform merge, keeping all stations from the *pivoted* data (right merge)
         final_df = pd.merge(locations_df, pivoted_df, on='stationId', how='right')
         # Reorder columns: ID, name, location, timestamp, then sorted parameters
         core_cols = ['stationId', 'stationName', 'location', 'timestamp']
         param_cols = sorted([col for col in final_df.columns if col not in core_cols])
         final_cols_order = [col for col in core_cols if col in final_df.columns] + param_cols
         final_df = final_df[final_cols_order]
         print("Location data merged.")
    else:
         final_df = pivoted_df # Use pivoted data if locations couldn't be loaded
         # Reorder columns: ID, timestamp, then sorted parameters
         core_cols = ['stationId', 'timestamp']
         param_cols = sorted([col for col in final_df.columns if col not in core_cols])
         final_cols_order = [col for col in core_cols if col in final_df.columns] + param_cols
         final_df = final_df[final_cols_order]
         print("Location data skipped.")


    # --- Save as JSON ---
    print(f"Preparing to save {len(final_df)} records to {OUTPUT_JSON_FILE}...")
    # Handle potential NaN/NaT values -> convert to None for JSON compatibility
    final_df = final_df.replace({np.nan: None, pd.NaT: None})
    output_data = final_df.to_dict(orient='records')

    try:
        # Create directory if it doesn't exist
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        # Write the JSON file, overwriting the previous one
        with open(OUTPUT_JSON_FILE, 'w') as f:
            json.dump(output_data, f, indent=2) # Use indent for readability
        print(f"✅ Data saved successfully to '{OUTPUT_JSON_FILE}'!")
    except Exception as e:
        print(f"🔴 ERROR: Failed to write JSON file: {e}")

    print(f"[{datetime.now()}] --- CPCB Scraper Finished ---")

if __name__ == "__main__":
    main()