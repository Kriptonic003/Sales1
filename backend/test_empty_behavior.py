import requests
import time
import json

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("TESTING BACKEND BEHAVIOR FOR NEW PRODUCT (NO DATA)")
print("=" * 60)

product_name = f"NonExistentProduct_{int(time.time())}"
brand_name = "GhostBrand"

print(f"Product: {product_name}")
print(f"Brand: {brand_name}")
print("-" * 60)

# Test 1: Analyze Sentiment (should trigger fallback fetch in crud.py)
print("\n[1/2] Calling /analyze-sentiment (Expect ~10s wait if fallback fetch runs)...")
start_time = time.time()
try:
    response = requests.post(
        f"{BASE_URL}/analyze-sentiment",
        json={
            "product_name": product_name,
            "brand_name": brand_name,
            "platform": "YouTube",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        },
        timeout=30 # longer timeout to catch the backend delay
    )
    duration = time.time() - start_time
    print(f"✓ Status: {response.status_code}")
    print(f"✓ Duration: {duration:.2f} seconds")
    print(f"✓ Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    duration = time.time() - start_time
    print(f"✗ Error: {e}")
    print(f"✗ Duration: {duration:.2f} seconds")

# Test 2: Predict Sales Loss
print("\n[2/2] Calling /predict-sales-loss...")
start_time = time.time()
try:
    response = requests.post(
        f"{BASE_URL}/predict-sales-loss",
        json={
            "product_name": product_name,
            "brand_name": brand_name,
            "platform": "YouTube",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        },
        timeout=30
    )
    duration = time.time() - start_time
    print(f"✓ Status: {response.status_code}")
    print(f"✓ Duration: {duration:.2f} seconds")
    print(f"✓ Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    duration = time.time() - start_time
    print(f"✗ Error: {e}")
    print(f"✗ Duration: {duration:.2f} seconds")

print("\n" + "=" * 60)
