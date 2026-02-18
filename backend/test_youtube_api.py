import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")
print(f"API Key: {API_KEY[:5]}...{API_KEY[-5:] if API_KEY else 'None'}")

if not API_KEY:
    print("Error: YOUTUBE_API_KEY not found in .env")
    exit(1)

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

params = {
    "part": "snippet",
    "q": "sunscreen mamaearth",
    "type": "video",
    "maxResults": 1,
    "key": API_KEY
}

print("\nTesting YouTube Search API...")
try:
    resp = requests.get(SEARCH_URL, params=params, timeout=10)
    print(f"Status: {resp.status_code}")
    
    if resp.status_code != 200:
        print("Error Response:")
        print(resp.text)
    else:
        print("Success! Found video:")
        items = resp.json().get("items", [])
        if items:
            print(f"Video ID: {items[0]['id']['videoId']}")
            print(f"Title: {items[0]['snippet']['title']}")
        else:
            print("No videos found.")

except Exception as e:
    print(f"Exception: {e}")
