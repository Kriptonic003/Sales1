import os
import requests
import re
from langdetect import detect
from dotenv import load_dotenv

load_dotenv(override=True)
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
COMMENTS_URL = "https://www.googleapis.com/youtube/v3/commentThreads"


# --------------------------------------------------
# LANGUAGE + CLEANING FUNCTIONS
# --------------------------------------------------

def is_hindi_script(text: str) -> bool:
    # Check for Devanagari characters (U+0900 to U+097F)
    return any('\u0900' <= char <= '\u097f' for char in text)


def is_english(text: str) -> bool:
    if is_hindi_script(text):
        return False
    try:
        return detect(text) == "en"
    except:
        return False


hindi_keywords = [
    "hai", "nahi", "nahin", "bahut", "acha", "accha", "bekar", "lekin",
    "bakwaas", "sahi", "kya", "kaise", "kyu", "bhai", "aage", "h", "v",
    "yaar", "ka", "ki", "ko", "se", "aur", "toh", "tha", "gaye", "aaye",
    "raha", "kar", "ho", "dikha", "hain", "na", "to", "bhi", "ek", "do",
    "kuch", "ab", "rha", "gyi", "gya", "bhot", "mast", "badhiya", "hoga"
]


def contains_hinglish(text: str) -> bool:
    text = text.lower()
    # Remove some punctuation for cleaner word splits
    text = re.sub(r'[,.!?]', ' ', text)
    words = text.split()
    
    # 1. Direct keyword check
    if any(word in hindi_keywords for word in words):
        return True
    
    # 2. Check for common suffix "h" or "v" used in texting
    # (e.g., "acha h", "acha v")
    if any(word == 'h' or word == 'v' for word in words):
        return True
        
    return False


def clean_text(text: str) -> str:
    text = re.sub(r"http\S+", "", text)  # remove links
    # Keep some punctuation but remove most special chars
    text = re.sub(r"[^A-Za-z0-9\s.,!?']", "", text)
    return text.strip()


# --------------------------------------------------
# SEARCH TOP VIDEOS
# --------------------------------------------------

def search_top_videos(query: str, max_videos: int = 10):
    try:
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "order": "relevance",
            "maxResults": max_videos,
            "key": YOUTUBE_API_KEY,
        }

        resp = requests.get(SEARCH_URL, params=params, timeout=10)

        if resp.status_code != 200:
            print("YouTube SEARCH API Error:", resp.text)
            return []

        items = resp.json().get("items", [])
        # Return list of dicts with id and title for context-aware filtering
        return [{"id": item["id"]["videoId"], "title": item["snippet"]["title"]} for item in items]

    except Exception as e:
        print("Error searching videos:", e)
        return []


# --------------------------------------------------
# FETCH COMMENTS FOR SINGLE VIDEO
# --------------------------------------------------

def fetch_comments_for_video(video_id: str, product_name: str = "", brand_name: str = "", video_title: str = "", max_comments: int = 100):
    try:
        params = {
            "part": "snippet",
            "videoId": video_id,
            "maxResults": max_comments,
            "textFormat": "plainText",
            "key": YOUTUBE_API_KEY,
        }

        resp = requests.get(COMMENTS_URL, params=params, timeout=10)

        if resp.status_code != 200:
            print(f"YouTube COMMENTS API Error for {video_id}: {resp.status_code}")
            return []

        comments = []
        
        # Prepare relevance keywords (case-insensitive)
        product_kw = product_name.lower() if product_name else ""
        brand_kw = brand_name.lower() if brand_name else ""
        title_lower = video_title.lower() if video_title else ""

        # CONTEXT-AWARE FILTER: 
        # If the video title ALREADY contains the product name, the whole video is likely relevant.
        # This allows us to grab comments like "I love it" or "This is great" which don't mention the product name.
        is_video_dedicated = product_kw and product_kw in title_lower

        for item in resp.json().get("items", []):
            snippet = item["snippet"]["topLevelComment"]["snippet"]
            raw_text = snippet["textDisplay"]
            text_lower = raw_text.lower()

            # 1. Relevance Filter
            # - If dedicated video: Accept all (but still watch out for other product names mentioned)
            # - If general video: Must mention product or brand
            if is_video_dedicated:
                is_relevant = True
            else:
                is_relevant = (product_kw and product_kw in text_lower) or (brand_kw and brand_kw in text_lower)
            
            if not is_relevant:
                continue

            # 2. Basic Cleaning
            cleaned = clean_text(raw_text)

            # 3. Language & Complexity Filters
            if (
                len(cleaned.split()) > 2 and # Min 3 words
                is_english(raw_text) and
                not contains_hinglish(raw_text)
            ):
                comments.append({
                    "text": cleaned,
                    "published_at": snippet["publishedAt"],
                })

        return comments

    except Exception as e:
        print(f"Error fetching comments for video {video_id}: {e}")
        return []


# --------------------------------------------------
# FETCH COMMENTS FROM MULTIPLE VIDEOS
# --------------------------------------------------

def fetch_comments_from_top_videos(query: str, product_name: str = "", brand_name: str = "", min_comments: int = 150):
    try:
        all_comments = []
        # Search for up to 50 videos now
        video_info_list = search_top_videos(query, max_videos=50)

        if not video_info_list:
            print("No videos found for query:", query)
            return []

        for info in video_info_list:
            vid = info["id"]
            title = info["title"]
            
            # Fetch context-aware comments
            comments = fetch_comments_for_video(vid, product_name, brand_name, video_title=title, max_comments=100)
            all_comments.extend(comments)
            
            print(f"[{len(all_comments)}] Fetched {len(comments)} comments from '{title[:40]}...'")
            
            if len(all_comments) >= min_comments:
                print(f"Target of {min_comments} reached! Total: {len(all_comments)}")
                break

        return all_comments[:min_comments] if len(all_comments) > min_comments else all_comments

    except Exception as e:
        print("Error in multi-video fetch:", e)
        return []