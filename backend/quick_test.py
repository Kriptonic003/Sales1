import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("TESTING ANALYZE FLOW (WITHOUT YOUTUBE FETCH)")
print("=" * 60)

# Test sentiment analysis with existing data
print("\n[1/2] Testing /analyze-sentiment...")
try:
    response = requests.post(
        f"{BASE_URL}/analyze-sentiment",
        json={
            "product_name": "NeoGadget",
            "brand_name": "BlueNova",
            "platform": "YouTube",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        },
        timeout=10
    )
    print(f"✓ Status: {response.status_code}")
    data = response.json()
    print(f"✓ Average Sentiment: {data['average_sentiment']}")
    print(f"✓ Negative %: {data['negative_percentage']}")
    print(f"✓ Total Posts: {data['total_posts']}")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

# Test sales prediction
print("\n[2/2] Testing /predict-sales-loss...")
try:
    response = requests.post(
        f"{BASE_URL}/predict-sales-loss",
        json={
            "product_name": "NeoGadget",
            "brand_name": "BlueNova",
            "platform": "YouTube",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        },
        timeout=10
    )
    print(f"✓ Status: {response.status_code}")
    data = response.json()
    print(f"✓ Predicted Drop: {data['predicted_drop_percentage']}%")
    print(f"✓ Risk Level: {data['risk_level']}")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✓ ANALYZE FEATURE IS WORKING!")
print("=" * 60)
print("\nThe frontend will now show these results when you click")
print("'Run Analysis' on the /analyze page!")
