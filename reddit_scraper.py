import requests
import pandas as pd
def scrape_reddit_thread(url):
    """Scrapes all comments from a single Reddit thread URL."""
    print(f"🕵️‍♂️ Scraping direct Reddit thread: {url}")
    # Add .json to the end of the URL to get the data directly
    json_url = url.rstrip('/') + ".json"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpinionLens/1.0'}
    
    try:
        response = requests.get(json_url, headers=headers, timeout=10)
        data = response.json()
        
        # Reddit JSON returns a list: [PostData, CommentData]
        comments_list = data[1]['data']['children']
        
        all_comments = []
        for c in comments_list:
            body = c['data'].get('body', '')
            if len(body) > 10:
                all_comments.append({
                    "title": "Commenter",
                    "body": body,
                    "score": c['data'].get('score', 0),
                    "type": "reddit_comment"
                })
                
        return pd.DataFrame(all_comments)
    except Exception as e:
        print(f"❌ Reddit Link Error: {e}")
        return None
    
def search_reddit(query, max_results=100):
    """Scrapes live Reddit posts for any given search term."""
    print(f"\n🕵️‍♂️ Searching Reddit for: {query}...")
    
    # Reddit requires a custom User-Agent to not block the request
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OpinionLens/1.0'}
    url = f"https://www.reddit.com/search.json?q={query}&limit={max_results}&type=link"
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()
        
        all_reviews = []
        for post in data.get('data', {}).get('children', []):
            post_data = post['data']
            title = post_data.get('title', '')
            body = post_data.get('selftext', '')
            
            # Combine title and body for the AI to read
            text = f"{title}. {body}".strip()
            if len(text) < 15: continue # Skip empty/tiny posts
                
            all_reviews.append({
                "title": title,
                "body": text,
                "score": post_data.get('score', 0), # Upvotes
                "rating": 0.0, # Reddit doesn't have 5-star ratings
                "num_comments": post_data.get('num_comments', 0),
                "url": f"https://reddit.com{post_data.get('permalink', '')}",
                "type": "reddit_post"
            })
            
        if not all_reviews:
            print("⚠️ No Reddit discussions found.")
            return None
            
        df = pd.DataFrame(all_reviews)
        print(f"✅ Extracted {len(df)} live discussions from Reddit!")
        return df
        
    except Exception as e:
        print(f"❌ Reddit Scraper Error: {e}")
        return None