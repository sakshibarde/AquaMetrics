# models/classification.py
import os
import json
import joblib
import numpy as np
import pandas as pd
from keras.models import load_model
import warnings

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
warnings.filterwarnings('ignore', category=UserWarning, module='tensorflow')

# --- PART 1: LOAD PRE-TRAINED MODELS (ONCE) ---
MODEL_DIR = "model_store/classification" 
print("Loading classification models...")

try:
    # --- Load all 4 files you downloaded ---
    model_path = os.path.join(MODEL_DIR, 'classification_model.h5')
    scaler_path = os.path.join(MODEL_DIR, 'classification_scaler.pkl')
    encoder_path = os.path.join(MODEL_DIR, 'classification_label_encoder.pkl')
    features_path = os.path.join(MODEL_DIR, 'classification_features.json')

    # 1. Load the Keras Model
    model = load_model(model_path, compile=False) # compile=False makes loading faster
    
    # 2. Load the Scaler
    scaler = joblib.load(scaler_path)
    
    # 3. Load the Label Encoder
    label_encoder = joblib.load(encoder_path)
    
    # 4. Load the Feature List
    with open(features_path, 'r') as f:
        features = json.load(f)
        
    print("✅ Classification model, scaler, and encoder loaded successfully.")
    
except Exception as e:
    print(f"🔴 CRITICAL ERROR: Failed to load classification model from '{MODEL_DIR}'.")
    print(f"Error: {e}")
    print("➡️ Make sure 'classification_model.h5', 'classification_scaler.pkl', 'classification_label_encoder.pkl', and 'classification_features.json' are in the 'models' folder.")
    model, scaler, label_encoder, features = None, None, None, []


# --- PART 2: PREDICTION FUNCTIONS (FOR YOUR API) ---

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
    This is the function your main.py will call.
    """
    if model is None:
        return {"status": "error", "message": "Model not loaded. Server error."}
        
    try:
        # --- CRITICAL ---
        # Create a DataFrame from the user's dictionary.
        # By passing columns=features, we GUARANTEE the column order
        # is the same as the one the model was trained on.
        input_df = pd.DataFrame(user_input_dict, index=[0])
        input_df = input_df[features] # Enforce column order
        
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
        with warnings.catch_warnings():
             warnings.simplefilter("ignore") # Suppress prediction warnings
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

# --- This block is for testing the script directly ---
if __name__ == "__main__":
    if model:
        print("\n--- 🧪 Testing model with sample data ---")
        # Create sample data based on your features
        sample_data = {
             'Biochemical Oxygen Demand': 2.5,
             'Chemical Oxygen Demand': 20,
             'Chloride': 50,
             'Conductivity': 300,
             'Depth': 1.5,
             'Dissolved Oxygen': 7.5,
             'Nitrate': 1.0,
             'Total Organic Carbon': 3.0,
             'Water Level': 2.0,
             'Water Temperature': 22.0,
             'Water Turbidity': 4.0,
             'pH': 7.2
        }
        # Ensure your sample data has all the features your model expects
        test_input = {f: sample_data.get(f, 0) for f in features}
        
        result = predict_water_quality(test_input)
        print(json.dumps(result, indent=2))
    else:
        print("\n--- ⚠️ Model not loaded. Cannot run test. ---")