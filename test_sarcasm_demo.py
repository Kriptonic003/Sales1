import os
import sys

# Force offline mode to use your local cached models
os.environ["HF_HUB_OFFLINE"] = "1"
# Add the backend folder to the Python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from ml.sentiment_classifier import LocalSarcasmDetector, DistilBERTSentimentClassifier

def run_demo():
    print("--- Initializing Local ML Models (this may take a few seconds) ---")
    try:
        sarcasm_detector = LocalSarcasmDetector()
        sentiment_model = DistilBERTSentimentClassifier()
    except Exception as e:
        print(f"Error loading models: {e}")
        return
    
    print("\n--- Sarcasm Detection Demo ---")
    print("Test how the system catches sarcasm and filters positive comments.")
    
    while True:
        try:
            text = input("\nEnter a comment to test (or 'q' to quit): ")
            if not text or text.lower() == 'q': break
            
            # 1. Get initial sentiment
            label, score = sentiment_model.classify(text)
            
            # 2. Check for sarcasm (Now using hybrid Heuristic + ML logic)
            is_sarcastic = sarcasm_detector.is_sarcastic(text)
            
            # 3. Apply filtering logic
            final_label = label
            if label.lower() == "positive" and is_sarcastic:
                final_label = "NEGATIVE (Refined: Sarcasm indicates hidden negative intent)"
                
            print(f"-> Initial Sentiment: {label.upper()} ({score:.2f})")
            print(f"-> Sarcasm Detected:  {is_sarcastic}")
            print(f"-> Final Result:      {final_label}")
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    run_demo()
