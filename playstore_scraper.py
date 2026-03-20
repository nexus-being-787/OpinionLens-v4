import pandas as pd
import re
from google_play_scraper import Sort, reviews, app

def fetch_playstore_reviews(playstore_url, max_reviews=150):
    """Bypasses web scraping entirely and pulls reviews via Google's internal API."""
    print(f"\n📱 Play Store Scraper starting for: {playstore_url[:70]}...")
    
    # 1. Extract the App ID from the URL (e.g., com.whatsapp)
    match = re.search(r'id=([a-zA-Z0-9._]+)', playstore_url)
    if not match:
        print("❌ Could not find an App ID (like 'id=com.app.name') in the URL.")
        return None
        
    app_id = match.group(1)
    print(f"   ✅ Successfully locked onto App ID: {app_id}")

    try:
        # Optional: Grab the actual app name for the frontend dashboard
        app_info = app(app_id, lang='en', country='us')
        app_name = app_info.get('title', 'Play Store App')
        app_icon = app_info.get('icon', 'https://cdn-icons-png.flaticon.com/512/732/732208.png')
        
        # 2. Fetch the reviews!
        print("   📄 Pulling reviews directly from Google servers...")
        result, continuation_token = reviews(
            app_id,
            lang='en', # Language
            country='us', # Country
            sort=Sort.NEWEST, # Grab the latest feedback
            count=max_reviews # How many to pull
        )
        
        if not result:
            print("   ℹ️ No reviews found for this app.")
            return None, None

        all_reviews = []
        for r in result:
            body = r.get('content', '').strip()
            if len(body) < 10: continue # Skip empty or 1-word reviews
                
            all_reviews.append({
                "title": r.get('userName', 'Google User'), # Play store doesn't have review titles, so we use the username
                "body": body,
                "score": r.get('thumbsUpCount', 0), # Upvotes!
                "rating": r.get('score', 0), # 1 to 5 stars
                "num_comments": 0,
                "url": playstore_url,
                "type": "playstore_review"
            })
            
        df = pd.DataFrame(all_reviews)
        df.drop_duplicates(subset=['body'], inplace=True)
        print(f"✅ Extracted {len(df)} App Store reviews!")
        
        product_info = {
            "title": app_name,
            "description": app_info.get('summary', f"App analysis for {app_name}"),
            "category": "Software/App",
            "image": app_icon
        }
        
        return df, product_info
        
    except Exception as e:
        print(f"❌ Play Store Scraper Error: {e}")
        return None, None