# step10classification.py
import pandas as pd
import numpy as np
import sqlite3
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from keras.models import Sequential, load_model
from keras.layers import Dense, Dropout
from keras.utils import to_categorical
import joblib  # For saving/loading scaler and encoder
import os
import json

# --- PART 1: TRAINING FUNCTION (You run this ONCE) ---

def train_and_save_model(db_path, model_dir="models"):
    """
    Loads data from DB, trains the classification model, and saves:
    1. classification_model.h5 (The ANN model)
    2. classification_scaler.pkl (The scaler)
    3. classification_label_encoder.pkl (The class encoder)
    4. classification_features.json (List of feature names)
    """
    print("Starting model training...")
    os.makedirs(model_dir, exist_ok=True)
    
    # --- Load data from DB ---
    con = sqlite3.connect(db_path)
    try:
        df = pd.read_sql_query("SELECT * FROM water_records", con)
    finally:
        con.close()
        
    # --- WQI Label Generation ---
    def generate_labels(df):
        # Using weights from your original script
        nsf_weights = {
            'Dissolved Oxygen': 0.17, 'Fecal Coliform': 0.16, 'pH': 0.11,
            'Biochemical Oxygen Demand': 0.11, 'Temperature Change': 0.10,
            'Total Phosphate': 0.10, 'Nitrate': 0.10, 'Water Turbidity': 0.08,
            'Total Solids': 0.07
        }
        
        available_params = [col for col in df.columns if col in nsf_weights]
        if not available_params:
            print("Warning: No WQI parameters found. Creating dummy 'WQI_Class'.")
            df['WQI_Class'] = 'Medium'
            return df.dropna()
        
        df['WQI'] = df.apply(lambda row: sum(row[param] * nsf_weights[param] for param in available_params), axis=1)
        
        bins = [0, 25, 50, 75, 90, 100]
        labels = ['Very Bad', 'Bad', 'Medium', 'Good', 'Excellent']
        df['WQI_Class'] = pd.cut(df['WQI'], bins=bins, labels=labels, right=True, include_lowest=True)
        return df.dropna(subset=['WQI_Class'])

    df = generate_labels(df)
    
    # --- Define features and target ---
    features_list = [
        'Biochemical Oxygen Demand', 'Chemical Oxygen Demand', 'Chloride', 'Conductivity',
        'Depth', 'Dissolved Oxygen', 'Nitrate', 'Total Organic Carbon', 'Water Level',
        'Water Temperature', 'Water Turbidity', 'pH'
    ]
    features = [f for f in features_list if f in df.columns]
    target = 'WQI_Class'
    
    X = df[features]
    y = df[target]
    
    if X.empty or y.empty:
        print("Error: No data to train on after processing. Aborting training.")
        return

    # --- Preprocessing ---
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    y_categorical = to_categorical(y_encoded)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y_categorical, test_size=0.2, random_state=42)

    # --- Build and Train Model ---
    model = Sequential([
        Dense(64, input_dim=X_train.shape[1], activation='relu'),
        Dropout(0.5),
        Dense(32, activation='relu'),
        Dropout(0.5),
        Dense(y_categorical.shape[1], activation='softmax')
    ])
    
    model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
    model.fit(X_train, y_train, epochs=50, batch_size=10, validation_split=0.1, verbose=1)
    
    # --- Save all components ---
    model.save(os.path.join(model_dir, 'classification_model.h5'))
    joblib.dump(scaler, os.path.join(model_dir, 'classification_scaler.pkl'))
    joblib.dump(label_encoder, os.path.join(model_dir, 'classification_label_encoder.pkl'))
    
    with open(os.path.join(model_dir, 'classification_features.json'), 'w') as f:
        json.dump(features, f)
        
    print(f"✅ Training complete. All model files saved to '{model_dir}'.")


# --- PART 2: PREDICTION FUNCTION (FOR YOUR API) ---

# --- Load Models ONCE (when server starts) ---
MODEL_DIR = "models"
try:
    model_path = os.path.join(MODEL_DIR, 'classification_model.h5')
    scaler_path = os.path.join(MODEL_DIR, 'classification_scaler.pkl')
    encoder_path = os.path.join(MODEL_DIR, 'classification_label_encoder.pkl')
    features_path = os.path.join(MODEL_DIR, 'classification_features.json')

    model = load_model(model_path)
    scaler = joblib.load(scaler_path)
    label_encoder = joblib.load(encoder_path)
    with open(features_path, 'r') as f:
        features = json.load(f)
    print("✅ Classification model, scaler, and encoder loaded successfully.")
except Exception as e:
    print(f"🔴 CRITICAL ERROR: Failed to load classification model from '{MODEL_DIR}'.")
    print(f"Error: {e}")
    print("➡️ Please run 'python step10classification.py' in your terminal to train and create the files.")
    model, scaler, label_encoder, features = None, None, None, []

def get_insights(predicted_class):
    """Generates simple insights based on the predicted class."""
    if predicted_class == 'Bad' or predicted_class == 'Very Bad':
        return "Preventive measures advised: This water is not safe. Reduce industrial/agricultural discharge, improve wastewater treatment, and prevent contamination."
    elif predicted_class == 'Medium':
        return "Water quality is average. It may be usable for some purposes, but not for drinking. Monitoring is recommended."
    elif predicted_class == 'Good' or predicted_class == 'Excellent':
        return "The water quality is good to excellent. It is suitable for most uses, including recreation. May be drinkable after standard purification."
    else:
        return "Prediction uncertain."

def predict_water_quality(user_input_dict):
    """
    Takes user input as a dictionary and returns a prediction dictionary.
    This is the function your API will call.
    """
    if model is None:
        return {"status": "error", "message": "Model not loaded. Server error."}
        
    try:
        # Create DataFrame in the correct feature order
        input_df = pd.DataFrame(columns=features)
        input_df.loc[0] = user_input_dict
        
        # Convert all to numeric, forcing errors to NaN
        input_df_numeric = input_df.apply(pd.to_numeric, errors='coerce')
        
        # Check if any required features are missing (NaN)
        if input_df_numeric.isnull().values.any():
            missing = input_df_numeric.columns[input_df_numeric.isnull().any()].tolist()
            return {"status": "error", "message": f"Missing or invalid numeric value for: {', '.join(missing)}"}

        input_array = input_df_numeric.values
        
        # Scale the user's input
        scaled_input = scaler.transform(input_array)
        
        # Make the prediction
        prediction_probs = model.predict(scaled_input)
        predicted_class_index = np.argmax(prediction_probs, axis=1)[0]
        
        # Decode the prediction
        predicted_class_label = label_encoder.inverse_transform([predicted_class_index])[0]
        
        # Generate insights
        insights = get_insights(predicted_class_label)

        # Create a nice dictionary of probabilities
        class_probs = {label_encoder.inverse_transform([i])[0]: float(prob) for i, prob in enumerate(prediction_probs[0])}

        return {
            "status": "success",
            "class": predicted_class_label,
            "insights": insights,
            "probabilities": class_probs
        }
    except Exception as e:
        return {"status": "error", "message": f"Prediction failed: {e}. Check input values."}

# --- This makes the file runnable for training ---
if __name__ == "__main__":
    # To train your model, run this file from your terminal:
    # python step10classification.py
    print("Running training for classification model...")
    train_and_save_model(db_path='my_database.db', model_dir='models')