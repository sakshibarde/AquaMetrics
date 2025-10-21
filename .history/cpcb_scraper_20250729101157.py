import requests
import pandas as pd
import warnings
from datetime import datetime

# Suppress InsecureRequestWarning
warnings.simplefilter("ignore", category=requests.packages.urllib3.exceptions.InsecureRequestWarning)

# Function to fetch data (SSL verification disabled)
def fetch_data(url: str):
    try:
        response = requests.get(url, verify=False)  # Disabling SSL verification
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error {response.status_code}: {response.text}")
            return []
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return []

# Function to process and map data
def process_data(data):
    parameter_mapping = {
        "River Stage": "Water Level",
        "Oxygen, dissolved": "Dissolved Oxygen",
    }
    unit_mapping = {
        "River Stage": "m above MSL",
    }
    processed_data = []
    for dat in data:
        # Handling timestamp format with milliseconds
        timestamp = dat.get("timestamp", "")
        timestamp_date = None
        if timestamp:
            try:
                timestamp_date = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%fZ")  # Handling .000Z
            except ValueError:
                try:
                    timestamp_date = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")  # Fallback format
                except ValueError:
                    print(f"Invalid timestamp format: {timestamp}")
        processed_data.append({
            "stationId": dat.get("station_id", ""),
            "timestamp": timestamp,
            "timestampDate": timestamp_date,
            "value": dat.get("ts_value", ""),
            "unit": unit_mapping.get(dat.get("stationparameter_longname", ""), dat.get("ts_unitsymbol", "")),
            "parameterNo": dat.get("stationparameter_no", ""),
            "parameterName": parameter_mapping.get(dat.get("stationparameter_longname", ""), dat.get("stationparameter_longname", ""))
        })
    return processed_data

def main():
    """Main function to fetch, process, and save data."""
    url = "https://rtwqmsdb1.cpcb.gov.in/data/internet/layers/10/index.json"
    raw_data = fetch_data(url)
    
    if not raw_data:
        print("No data fetched. Exiting.")
        return

    mapped_data = process_data(raw_data)
    df = pd.DataFrame(mapped_data)

    # --- MODIFICATION START ---
    # Create a dynamic filename with the current date and time
    timestamp_str = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename = f"water_data_{timestamp_str}.csv"
    # --- MODIFICATION END ---

    df.to_csv(filename, index=False)
    print(f"Data saved successfully as '{filename}'!")

if __name__ == "__main__":
    main()