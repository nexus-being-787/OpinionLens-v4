import os
import requests
import re
from dotenv import load_dotenv

load_dotenv()
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY")

def clean_query(title):
    """
    Strips away junk words so the News API searches for the actual product,
    not the URL source or the word 'Analysis'.
    """
    # Lowercase everything for cleaning
    query = title.lower()
    
    # Remove words that ruin news searches
    junk_words = ["analysis", "review", "amazon", "flipkart", "reddit", "youtube", "app store", "play store", "product"]
    for word in junk_words:
        query = query.replace(word, "")
        
    # Remove special characters and extra spaces
    query = re.sub(r'[^a-z0-9\s]', '', query).strip()
    
    # If the title is massive, only take the first 3-4 words (usually the brand/product name)
    words = query.split()
    if len(words) > 4:
        query = " ".join(words[:4])
        
    return query

def fetch_product_news(topic):
    """Fetches strictly relevant news articles for the given topic."""
    print(f"\n📰 Fetching latest news for: {topic}...")
    
    if not NEWSAPI_KEY or NEWSAPI_KEY == "your_newsapi_key_here":
        print("   ⚠️ No NewsAPI key found in .env file.")
        return []

    # Clean the topic to get the core product name
    search_term = clean_query(topic)
    
    # If cleaning deleted everything, fallback to the first word
    if len(search_term) < 2:
        search_term = topic.split()[0]
        
    print(f"   🔍 Purified search term: '{search_term}'")

    try:
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": search_term,         # Search ONLY for the purified product name
            "searchIn": "title",      # STRICT MODE: The product MUST be in the headline
            "sortBy": "relevancy",
            "language": "en",
            "pageSize": 4,
            "apiKey": NEWSAPI_KEY
        }
        
        res = requests.get(url, params=params, timeout=5)
        data = res.json()
        
        if data.get("status") == "ok" and data.get("totalResults", 0) > 0:
            articles = data["articles"]
            news_list = []
            
            for a in articles:
                # Filter out dead links or removed articles
                if a.get('title') and a.get('url') and '[Removed]' not in a['title']:
                    news_list.append({
                        "title": a['title'],
                        "source": a['source']['name'],
                        "url": a['url']
                    })
                    
            print(f"   ✅ Fetched {len(news_list)} highly relevant news articles.")
            return news_list
        else:
            print("   ⚠️ No relevant news found. Returning empty to avoid random garbage.")
            return [] # Returns an empty list instead of random tech news
            
    except Exception as e:
        print(f"   ❌ News Fetch Error: {e}")
        return []