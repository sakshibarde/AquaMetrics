# scripts/test_model.py
import sys
import os

# --- This is a bit of a trick to import from the 'models' folder ---
# It adds the main 'backend' directory to Python's path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)
# -----------------------------------------------------------------

# Import the prediction function AND the feature list from your model script
from models.classification import predict_water_quality, features

def run_interactive_test():
    """
    Loads the trained model and runs an interactive loop 
    to test new predictions.
    """
    print("--- 🤖 Interactive Water Quality Predictor ---")
    print(f"Loaded model with {len(features)} features.")
    print("Enter the values for each parameter. Type 'exit' to quit.\n")

    while True:
        try:
            user_input_dict = {}
            for feature in features:
                prompt = f"➡️ Enter value for {feature}: "
                user_input = input(prompt)

                if user_input.lower() == 'exit':
                    raise SystemExit # Exit the script

                user_input_dict[feature] = float(user_input)
            
            # We have all the inputs, now get a prediction
            print("\n...Calling model...")
            result = predict_water_quality(user_input_dict)
            
            print("\n--- Prediction Result ---")
            if result['status'] == 'success':
                print(f"🌊 Predicted Class: {result['class']}")
                print(f"💡 Insights: {result['insights']}")
                print("\nProbabilities:")
                for class_name, prob in result['probabilities'].items():
                    print(f"  - {class_name}: {prob*100:.2f}%")
            else:
                print(f"⚠️ Error: {result['message']}")
            print("-" * 25 + "\n")

        except ValueError:
            print("\n⚠️ Invalid input. Please enter a valid number.\n")
        except SystemExit:
            print("\nExiting the predictor. Goodbye! 👋")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}")
            break

if __name__ == "__main__":
    run_interactive_test()