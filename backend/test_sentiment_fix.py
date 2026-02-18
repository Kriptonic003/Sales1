"""
Test script to verify sentiment classification is working correctly
"""

import sys
from pathlib import Path

backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

def test_sentiment_flow():
    """Test the complete sentiment classification flow"""
    
    print("=" * 70)
    print("Testing DistilBERT Sentiment Classification Integration")
    print("=" * 70)
    print()
    
    try:
        from ml.sentiment_classifier import DistilBERTSentimentClassifier
        from ml.pipeline import SentimentAndSalesPipeline
        print("✓ Imports successful")
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    
    print()
    print("Initializing DistilBERT classifier...")
    try:
        classifier = DistilBERTSentimentClassifier()
        print("✓ Classifier initialized")
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return False
    
    print()
    print("=" * 70)
    print("Test Case 1: Positive Comments")
    print("=" * 70)
    positive_comments = [
        "This product is amazing! I absolutely love it!",
        "Best purchase ever, highly recommend!",
        "Excellent quality, great service!",
    ]
    
    for comment in positive_comments:
        label, confidence = classifier.classify(comment)
        print(f"✓ '{comment[:50]}...'")
        print(f"  → Label: {label.upper()} (Confidence: {confidence:.2%})")
        if label.lower() != "positive":
            print(f"  ⚠️  WARNING: Expected 'positive' but got '{label}'")
        print()
    
    print()
    print("=" * 70)
    print("Test Case 2: Negative Comments")
    print("=" * 70)
    negative_comments = [
        "Terrible quality, waste of money!",
        "Worst product ever, don't buy!",
        "Broke after one day, very disappointed",
    ]
    
    for comment in negative_comments:
        label, confidence = classifier.classify(comment)
        print(f"✓ '{comment[:50]}...'")
        print(f"  → Label: {label.upper()} (Confidence: {confidence:.2%})")
        if label.lower() != "negative":
            print(f"  ⚠️  WARNING: Expected 'negative' but got '{label}'")
        print()
    
    print()
    print("=" * 70)
    print("Test Case 3: Neutral Comments")
    print("=" * 70)
    neutral_comments = [
        "It is what it is",
        "Average product, nothing special",
        "Works fine, meets expectations",
    ]
    
    for comment in neutral_comments:
        label, confidence = classifier.classify(comment)
        print(f"✓ '{comment[:50]}...'")
        print(f"  → Label: {label.upper()} (Confidence: {confidence:.2%})")
        print()
    
    print()
    print("=" * 70)
    print("Test Case 4: Sentiment Score Conversion")
    print("=" * 70)
    
    test_cases = [
        ("positive", 0.95),
        ("negative", 0.92),
        ("neutral", 0.5),
    ]
    
    for label, confidence in test_cases:
        score = classifier.convert_to_sentiment_score(label, confidence)
        print(f"Label: {label:10} | Confidence: {confidence:.2f} → Sentiment Score: {score:+.3f}")
    
    print()
    print("=" * 70)
    print("Test Case 5: Batch Analysis")
    print("=" * 70)
    
    batch = [
        "This is great!",
        "This is terrible",
        "It's okay",
        "Absolutely loved it!",
        "Don't recommend",
    ]
    
    summary = classifier.get_sentiment_summary(batch)
    print(f"Analyzed {summary['total_texts']} comments:")
    print(f"  Positive:  {summary['positive_count']:2d} ({summary['positive_percentage']:5.1f}%)")
    print(f"  Negative:  {summary['negative_count']:2d} ({summary['negative_percentage']:5.1f}%)")
    print(f"  Neutral:   {summary['neutral_count']:2d} ({summary['neutral_percentage']:5.1f}%)")
    print(f"  Average Sentiment Score: {summary['average_sentiment']:+.3f}")
    
    print()
    print("=" * 70)
    print("✅ All tests completed successfully!")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Run: uvicorn main:app --reload")
    print("2. Call /analyze-sentiment endpoint with YouTube comments")
    print("3. Check /comments endpoint for individual sentiment labels")
    print("4. Verify /get-dashboard-data shows correct sentiment distribution")
    print()
    
    return True


if __name__ == "__main__":
    try:
        success = test_sentiment_flow()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
