# -*- coding: utf-8 -*-
"""
STEP 10 - Water Quality Classification Pipeline
--------------------------------------------------
Trains a neural network model to classify water quality 
(WQI classes) based on environmental parameters, saves the
model, and provides a prediction function for dashboard use.
"""

import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from keras.models import Sequential, load_model
from keras.layers import Dense, Input, Dropout
from keras.utils import to_categorical
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# ==============================
# 1️⃣ CONFIGURATION
# ==============================
DATA_PATH = "data/preprocessed_combined_station_data.csv"
MODEL_DIR = "models/"
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "wqi_model.h5")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")

# ==============================
# 2️⃣ FUNCTION TO GENERATE LABELS
# ==============================
def generate_labels(df):
    nsf_weights = {
        'Dissolved Oxygen': 0.17, 'Fecal Coliform': 0.16, 'pH': 0.11,
        'Biochemical Oxygen Demand': 0.11, 'Temperature Change': 0.10,
        'Total Phosphate': 0.10, 'Nitrate': 0.10, 'Water Turbidity': 0.08,
        'Total Solids': 0.07
    }

    available_params = [col for col in df.columns if col in nsf_weights]
    total_original_weight = sum(nsf_weights[param] for param in available_params)
    rescaled_weights = {param: nsf_weights[param] / total_original_weight for param in available_params}

    def calculate_qi(parameter, value):
        if parameter == 'Dissolved Oxygen':
            if value >= 8.0: return 100
            elif value >= 7.0: return 90
            elif value >= 6.0: return 80
            elif value >= 5.0: return 70
            elif value >= 4.0: return 50
            elif value >= 3.0: return 30
            else: return 10
        elif parameter == 'Biochemical Oxygen Demand':
            return 100 if value <= 1 else 80 if value <= 2 else 60 if value <= 3 else 40 if value <= 5 else 20
        elif parameter == 'pH':
            return 100 if 7.1 <= value <= 7.5 else 90 if 6.6 <= value <= 8.0 else 80 if 6.1 <= value <= 8.5 else 70 if 5.6 <= value <= 9.0 else 60 if 5.1 <= value <= 9.5 else 40
        elif parameter == 'Nitrate':
            return 100 if value <= 0.5 else 90 if value <= 1 else 80 if value <= 2 else 60 if value <= 4 else 40 if value <= 8 else 20
        elif parameter == 'Water Turbidity':
            return 100 if value <= 5 else 80 if value <= 10 else 60 if value <= 15 else 40 if value <= 20 else 20
        return 0

    wqi_scores = []
    for _, row in df.iterrows():
        wqi_score = sum(calculate_qi(p, row[p]) * rescaled_weights[p] for p in available_params)
        wqi_scores.append(wqi_score)

    df['NSF_WQI'] = wqi_scores

    def classify_wqi(wqi):
        if wqi >= 90: return "Excellent"
        elif wqi >= 70: return "Good"
        elif wqi >= 50: return "Medium"
        elif wqi >= 25: return "Bad"
        else: return "Very Bad"

    df['WQI_Class'] = df['NSF_WQI'].apply(classify_wqi)
    return df

# ==============================
# 3️⃣ TRAINING FUNCTION
# ==============================
def train_model():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"❌ Data file not found at {DATA_PATH}")

    print("📥 Loading data...")
    df = pd.read_csv(DATA_PATH)

    df = generate_labels(df)

    features = [
        'Biochemical Oxygen Demand', 'Chemical Oxygen Demand', 'Chloride', 'Conductivity',
        'Depth', 'Dissolved Oxygen', 'Nitrate', 'Total Organic Carbon', 'Water Level',
        'Water Temperature', 'Water Turbidity', 'pH'
    ]

    df.dropna(subset=features + ['WQI_Class'], inplace=True)

    X = df[features]
    y = df['WQI_Class']

    # Scale + Encode
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    encoder = LabelEncoder()
    y_encoded = encoder.fit_transform(y)
    y_categorical = to_categorical(y_encoded)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_categorical, test_size=0.2, random_state=42, stratify=y_categorical
    )

    # Model architecture
    model = Sequential([
        Input(shape=(X_train.shape[1],)),
        Dense(128, activation='relu'),
        Dropout(0.3),
        Dense(64, activation='relu'),
        Dropout(0.3),
        Dense(32, activation='relu'),
        Dense(16, activation='relu'),
        Dense(y_categorical.shape[1], activation='softmax')
    ])

    model.compile(optimizer='rmsprop', loss='categorical_crossentropy', metrics=['accuracy'])

    print("\n🚀 Training model...")
    history = model.fit(
        X_train, y_train,
        epochs=70, batch_size=32,
        validation_split=0.1, verbose=1
    )

    # Evaluate
    loss, acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n✅ Test Accuracy: {acc*100:.2f}% | Loss: {loss:.4f}")

    # Save artifacts
    model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    print(f"📦 Saved model and preprocessors to {MODEL_DIR}")

    # Optional: Confusion Matrix
    y_pred = np.argmax(model.predict(X_test), axis=1)
    y_true = np.argmax(y_test, axis=1)

    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(7,5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=encoder.classes_, yticklabels=encoder.classes_)
    plt.title("Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.show()


# ==============================
# 4️⃣ PREDICTION FUNCTION (for Dashboard)
# ==============================
def predict_water_quality(input_data):
    """
    input_data: dict or list of parameter values (in the same order as training features)
    Example:
    {
        "Biochemical Oxygen Demand": 2.1,
        "Chemical Oxygen Demand": 30,
        "Chloride": 15,
        "Conductivity": 120,
        ...
    }
    """
    model = load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    encoder = joblib.load(ENCODER_PATH)

    features = [
        'Biochemical Oxygen Demand', 'Chemical Oxygen Demand', 'Chloride', 'Conductivity',
        'Depth', 'Dissolved Oxygen', 'Nitrate', 'Total Organic Carbon', 'Water Level',
        'Water Temperature', 'Water Turbidity', 'pH'
    ]

    if isinstance(input_data, dict):
        input_array = np.array([input_data[feature] for feature in features]).reshape(1, -1)
    else:
        input_array = np.array(input_data).reshape(1, -1)

    scaled_input = scaler.transform(input_array)
    prediction_probs = model.predict(scaled_input)
    predicted_class_index = np.argmax(prediction_probs, axis=1)[0]
    predicted_label = encoder.inverse_transform([predicted_class_index])[0]

    return {
        "Predicted_Class": predicted_label,
        "Class_Probabilities": dict(zip(encoder.classes_, prediction_probs[0].round(3).tolist()))
    }


# ==============================
# 5️⃣ MAIN EXECUTION
# ==============================
if __name__ == "__main__":
    print("=== WATER QUALITY CLASSIFICATION PIPELINE ===")
    train_model()
