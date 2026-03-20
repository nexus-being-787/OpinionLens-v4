import os
import pandas as pd
from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")

# CRANK THE LIMIT UP TO 500!
def fetch_from_apify(url, max_items=500):
    """Routes the URL to Apify and extracts hundreds of comments."""
    if not APIFY_API_TOKEN:
        print("❌ Missing APIFY_API_TOKEN in .env file.")
        return None

    client = ApifyClient(APIFY_API_TOKEN)
    comments_data = []

    try:
        # ── ROUTE 1: INSTAGRAM ────────────────────────────────────────────────
        if "instagram.com" in url:
            print(f"📸 Asking Apify for up to {max_items} Instagram comments...")
            
            run_input = {
                "directUrls": [url],
                "resultsLimit": max_items, 
            }
            run = client.actor("apify/instagram-comment-scraper").call(run_input=run_input)
            
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                text = item.get("text", "")
                if len(text) > 5:
                    comments_data.append({
                        "title": "Instagram Post",
                        "body": text,
                        "score": item.get("likesCount", 0),
                        "num_comments": item.get("repliesCount", 0),
                        "url": url,
                        "type": "instagram_comment"
                    })

        # ── ROUTE 2: X / TWITTER ──────────────────────────────────────────────
        elif "twitter.com" in url or "x.com" in url:
            print(f"🐦 Asking Apify for up to {max_items} X/Twitter replies...")
            
            run_input = {
                "startUrls": [url],
                "maxItems": max_items,
            }
            run = client.actor("apidojo/tweet-scraper").call(run_input=run_input)
            
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                text = item.get("text", "")
                if len(text) > 5:
                    comments_data.append({
                        "title": "X (Twitter) Post",
                        "body": text,
                        "score": item.get("likeCount", 0) or item.get("favorite_count", 0) or 0,
                        "num_comments": item.get("replyCount", 0) or 0,
                        "url": url,
                        "type": "twitter_comment"
                    })
                    
        else:
            print("❌ Unsupported URL for Apify.")
            return None

        # ── PROCESS RESULTS ───────────────────────────────────────────────────
        if not comments_data:
            print("⚠️ Apify returned no data. The post might be private or have no comments.")
            return None

        df = pd.DataFrame(comments_data)
        print(f"✅ Success! Extracted {len(df)} items via Apify.")
        return df

    except Exception as e:
        print(f"❌ Apify Scraper Error: {e}")
        return None