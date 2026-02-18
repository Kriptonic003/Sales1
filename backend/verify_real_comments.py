import requests
import json
import time

BASE_URL = "http://localhost:8000"

print("=" * 60)
print("VERIFYING REAL YOUTUBE COMMENTS (FALLBACK FETCH)")
print("=" * 60)

product = "sunscreen"
brand = "mamaearth"

print(f"Product: {product}")
print(f"Brand: {brand}")
print("-" * 60)

# Step 1: Trigger Backend Fallback Fetch via /analyze-sentiment
# We skip the explicit /fetch-youtube-comments call to simulate frontend failure/skipping
print("\n[1/2] Calling /analyze-sentiment (Triggers Backend Fallback)...")
start = time.time()
try:
    response = requests.post(
        f"{BASE_URL}/analyze-sentiment",
        json={
            "product_name": product,
            "brand_name": brand,
            "platform": "YouTube",
            "start_date": "2023-01-01",
            "end_date": "2027-12-31"
        },
        timeout=30
    )
    duration = time.time() - start
    print(f"✓ Status: {response.status_code}")
    print(f"✓ Duration: {duration:.2f} seconds")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Analysis Result: {data['total_posts']} posts analyzed")
        if data['total_posts'] == 0:
            print("⚠️ WARNING: 0 posts found. Backend fallback fetch might have failed.")
    else:
        print(f"✗ Failed: {response.text}")
        exit(1)

except Exception as e:
    print(f"✗ Error: {e}")
    exit(1)

# Step 2: Get Comments to verify content
print("\n[2/2] Retrieving comments from DB to verify content...")
try:
    response = requests.get(
        f"{BASE_URL}/comments",
        params={
            "product_name": product,
            "brand_name": brand,
            "platform": "YouTube"
        }
    )
    comments = response.json()
    print(f"✓ Found {len(comments)} comments.")
    
    if comments:
        print("\nSample Comments:")
        for i, c in enumerate(comments[:3]):
            print(f"{i+1}. {c['content'][:100]}...")
            
        # Check for Rick Roll
        rick_roll = any("never gave us up" in c['content'].lower() for c in comments)
        if rick_roll:
            print("\n⚠️ WARNING: Rick Roll comments detected!")
        else:
            print("\n✓ Verification Passed: No Rick Roll comments found.")
            
except Exception as e:
    print(f"✗ Error: {e}")
