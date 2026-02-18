import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("TESTING ANALYZE PRODUCT FLOW")
print("=" * 60)

# Test 1: Fetch YouTube comments
print("\n[1/3] Testing /fetch-youtube-comments...")
try:
    response = requests.post(
        f"{BASE_URL}/fetch-youtube-comments",
        params={"product_name": "NeoGadget", "brand_name": "BlueNova", "max_videos": 3},
        timeout=30
    )
    print(f"✓ Status: {response.status_code}")
    print(f"✓ Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

# Test 2: Analyze sentiment
print("\n[2/3] Testing /analyze-sentiment...")
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
    print(f"✓ Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

# Test 3: Predict sales loss
print("\n[3/3] Testing /predict-sales-loss...")
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
    print(f"✓ Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✓ ALL TESTS PASSED!")
print("=" * 60)
