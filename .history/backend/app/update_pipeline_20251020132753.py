from app import scraper, utils, preprocess

def run_full_update(raw_url):
    # 1) Fetch latest hourly CSV
    df_raw = scraper.fetch_latest_from_github(raw_url)

    # 2) Organize and clean (Step3 + Step4 combined)
    df_org = preprocess.organize_records(df_raw)
    df_clean = preprocess.clean_and_standardize(df_org)

    # 3) Insert new rows into SQLite
    added = utils.insert_new_rows(df_clean)
    print(f"{added} new cleaned rows inserted")