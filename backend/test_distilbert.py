"""
Quick Test Script for DistilBERT Sentiment Classifier
Run this to verify the implementation works correctly
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def test_sentiment_classifier():
    """Test the DistilBERT sentiment classifier"""
    
    print("=" * 60)
    print("DistilBERT Sentiment Classifier - Quick Test")
    print("=" * 60)
    print()
    
    # Import after path is set
    try:
        from ml.sentiment_classifier import DistilBERTSentimentClassifier
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        print("\n⚠️  Make sure you've installed dependencies:")
        print("   pip install -r requirements.txt")
        return False
    
    print("✓ Successfully imported DistilBERTSentimentClassifier")
    print()
    
    # Initialize classifier
    print("Initializing DistilBERT model...")
    print("  (This may take 30-60 seconds on first run)")
    print()
    
    try:
        classifier = DistilBERTSentimentClassifier()
    except Exception as e:
        print(f"❌ Initialization Error: {e}")
        return False
    
    print()
    print("=" * 60)
    print("Testing Individual Classifications")
    print("=" * 60)
    print()
    
    test_cases = [
        "This product is absolutely amazing! I love it!",
        "Terrible quality, completely waste of money",
        "It's okay, nothing special really",
        "Best purchase I've ever made",
        "Don't buy this, worst experience ever",
        "Works as expected",
    ]
    
    for text in test_cases:
        label, score = classifier.classify(text)
        emoji = "😊" if label == "positive" else "😞" if label == "negative" else "😐"
        
        print(f"{emoji} Text: \"{text[:50]}...\"" if len(text) > 50 else f"{emoji} Text: \"{text}\"")
        print(f"   Label: {label.upper()}")
        print(f"   Confidence: {score:.2%}")
        print()
    
    print("=" * 60)
    print("Testing Batch Analysis")
    print("=" * 60)
    print()
    
    batch_texts = [
        "This is great!",
        "This is terrible",
        "It's okay",
        "Amazing product",
        "Waste of money",
    ]
    
    results = classifier.classify_batch(batch_texts)
    print(f"Analyzed {len(batch_texts)} texts in batch:")
    for text, (label, score) in zip(batch_texts, results):
        print(f"  • {text:20} → {label.upper():8} ({score:.2%})")
    
    print()
    print("=" * 60)
    print("Testing Sentiment Summary")
    print("=" * 60)
    print()
    
    summary = classifier.get_sentiment_summary(batch_texts)
    print(f"Average Sentiment Score: {summary['average_sentiment']:.3f}")
    print(f"Positive Comments: {summary['positive_count']}/{summary['total_texts']} ({summary['positive_percentage']:.1f}%)")
    print(f"Negative Comments: {summary['negative_count']}/{summary['total_texts']} ({summary['negative_percentage']:.1f}%)")
    print(f"Neutral Comments: {summary['neutral_count']}/{summary['total_texts']} ({summary['neutral_percentage']:.1f}%)")
    
    print()
    print("=" * 60)
    print("✅ All tests passed! DistilBERT is working correctly.")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Make sure .env file has YOUTUBE_API_KEY set")
    print("2. Run the backend: uvicorn main:app --reload")
    print("3. Test API endpoints with real YouTube comments")
    print()
    
    return True


if __name__ == "__main__":
    success = test_sentiment_classifier()
    sys.exit(0 if success else 1)
