import os
import requests

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
COMMENTS_URL = "https://www.googleapis.com/youtube/v3/commentThreads"


# --------------------------------------------------
# SEARCH TOP VIDEOS
# --------------------------------------------------
def search_top_videos(query: str, max_videos: int = 3):
    try:
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "order": "viewCount",
            "maxResults": max_videos,
            "key": YOUTUBE_API_KEY,
        }

        resp = requests.get(SEARCH_URL, params=params)

        if resp.status_code != 200:
            print("YouTube SEARCH API Error:", resp.text)
            return []

        items = resp.json().get("items", [])
        return [item["id"]["videoId"] for item in items]

    except Exception as e:
        print("Error searching videos:", e)
        return []


# --------------------------------------------------
# FETCH COMMENTS FOR SINGLE VIDEO
# --------------------------------------------------
def fetch_comments_for_video(video_id: str, max_comments: int = 20):
    try:
        params = {
            "part": "snippet",
            "videoId": video_id,
            "maxResults": max_comments,
            "textFormat": "plainText",
            "key": YOUTUBE_API_KEY,
        }

        resp = requests.get(COMMENTS_URL, params=params)

        if resp.status_code != 200:
            print("YouTube COMMENTS API Error:", resp.text)
            return []

        comments = []
        for item in resp.json().get("items", []):
            snippet = item["snippet"]["topLevelComment"]["snippet"]
            comments.append({
                "text": snippet["textDisplay"],
                "published_at": snippet["publishedAt"],
            })

        return comments

    except Exception as e:
        print("Error fetching comments:", e)
        return []


# --------------------------------------------------
# FETCH COMMENTS FROM MULTIPLE VIDEOS
# --------------------------------------------------
def fetch_comments_from_top_videos(query: str, max_videos: int = 3):
    try:
        all_comments = []
        video_ids = search_top_videos(query, max_videos)

        if not video_ids:
            print("No videos found for query:", query)
            return []

        for vid in video_ids:
            comments = fetch_comments_for_video(vid)
            all_comments.extend(comments)

        return all_comments

    except Exception as e:
        print("Error in multi-video fetch:", e)
        return []
