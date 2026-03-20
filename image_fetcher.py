import os
import requests
import re
from dotenv import load_dotenv

load_dotenv()

UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY")

def fetch_topic_image(topic):
    """
    Supercharged Image Engine: Uses Open Graph (og:image) to bypass 
    Wikipedia's strict API restrictions on copyrighted/Fair Use images.
    """
    print(f"\n🖼️ Attempting to fetch image for topic: {topic}")
    headers = {'User-Agent': 'OpinionLensApp/4.0 (contact: admin@opinionlens.com)'}

    try:
        # ── 1. RESOLVE THE EXACT WIKIPEDIA PAGE TITLE ──
        wiki_api = "https://en.wikipedia.org/w/api.php"
        params = {"action": "query", "titles": topic, "redirects": 1, "format": "json"}
        res = requests.get(wiki_api, params=params, headers=headers, timeout=5)
        pages = res.json().get('query', {}).get('pages', {})
        
        page_title = None
        for page_id, page_data in pages.items():
            if str(page_id) != '-1':
                page_title = page_data.get('title')
                break
        
        # If exact match fails, use Wikipedia's search
        if not page_title:
            search_params = {"action": "query", "generator": "search", "gsrsearch": topic, "gsrlimit": 1, "format": "json"}
            res2 = requests.get(wiki_api, params=search_params, headers=headers, timeout=5)
            pages2 = res2.json().get('query', {}).get('pages', {})
            for page_id, page_data in pages2.items():
                page_title = page_data.get('title')
                break

        # ── 2. SCRAPE THE OPEN GRAPH PREVIEW IMAGE ──
        if page_title:
            print(f"   ✅ Resolved topic to Wikipedia page: '{page_title}'")
            page_url = f"https://en.wikipedia.org/wiki/{page_title.replace(' ', '_')}"
            html_res = requests.get(page_url, headers=headers, timeout=5)
            
            # Search the HTML specifically for the Open Graph image tag
            match = re.search(r'<meta property="og:image" content="(.*?)"', html_res.text)
            if match:
                image_url = match.group(1)
                print("   ✅ Successfully extracted Open Graph image!")
                return image_url
            else:
                print("   ⚠️ No Open Graph image found on the page.")
                
    except Exception as e:
        print(f"   ⚠️ Wikipedia pipeline failed: {e}")

    # ── 3. UNSPLASH API (Fallback) ──
    if UNSPLASH_API_KEY and UNSPLASH_API_KEY != "your_unsplash_access_key_here":
        try:
            unsplash_url = "https://api.unsplash.com/search/photos"
            unsplash_params = {"query": topic, "client_id": UNSPLASH_API_KEY, "per_page": 1}
            unsplash_res = requests.get(unsplash_url, params=unsplash_params, timeout=5)
            
            if unsplash_res.status_code == 200:
                results = unsplash_res.json().get('results', [])
                if results:
                    print("   ✅ Found dynamic stock image via Unsplash API!")
                    return results[0]['urls']['regular']
        except Exception as e:
            print(f"   ⚠️ Unsplash API fetch failed: {e}")

    # ── 4. UNIVERSAL FALLBACK ──
    print("   ⚠️ No image found. Using default abstract fallback.")
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"