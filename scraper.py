import os
import pandas as pd
import time
import random
import warnings
import json
import urllib.parse
import requests

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

warnings.filterwarnings("ignore")

# ── Load API key from .env file ───────────────────────────────────────────────
load_dotenv()
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "")


# ── SEARCH: Serper.dev ────────────────────────────────────────────────────────

def _search_via_serper(topic, limit=5):
    """
    Real Google Search results via Serper.dev API.
    Free tier: 2500 searches/month — https://serper.dev
    """
    if not SERPER_API_KEY:
        print("   ⚠️ SERPER_API_KEY not set in .env — skipping.")
        return []

    urls = []
    try:
        resp = requests.post(
            "https://google.serper.dev/search",
            headers={
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            json={"q": f"{topic} site:reddit.com/r", "num": 10},
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()

        for result in data.get("organic", []):
            link = result.get("link", "")
            if "reddit.com/r/" in link and "/comments/" in link:
                urls.append(link)
            if len(urls) >= limit:
                break

        print(f"   ✅ Serper.dev found {len(urls)} Reddit threads.")

    except requests.exceptions.HTTPError as e:
        print(f"   ❌ Serper API error (check your key): {e}")
    except Exception as e:
        print(f"   ⚠️ Serper failed: {e}")

    return urls[:limit]


# ── REDDIT COMMENT SCRAPER ────────────────────────────────────────────────────

def _make_browser(playwright):
    """Stealth Chromium that looks like a real user to Reddit."""
    browser = playwright.chromium.launch(
        headless=True,
        args=[
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
        ]
    )
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale='en-US',
        timezone_id='America/New_York',
    )
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins',   { get: () => [1, 2, 3] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        window.chrome = { runtime: {} };
    """)
    return browser, context


def _scrape_reddit_post(page, post_url, max_comments=40):
    """
    Visits a Reddit thread in the headless browser (setting real cookies),
    then calls the .json endpoint from inside the browser session.
    This bypasses Reddit's 403 because the request carries real browser cookies.
    """
    clean_url = post_url.split('?')[0].rstrip('/')
    parsed_data = []

    # Step 1: Visit the page to get Reddit session cookies
    try:
        page.goto(clean_url, wait_until='domcontentloaded', timeout=25000)
        time.sleep(random.uniform(2.0, 3.5))
    except PlaywrightTimeout:
        time.sleep(2)
    except Exception as e:
        print(f"   ⚠️ Page load error: {e}")
        return parsed_data

    # Step 2: Fetch .json from inside the browser (uses cookies Reddit just set)
    json_url = clean_url + '.json?sort=top&limit=100'
    try:
        response = page.evaluate(f"""
            async () => {{
                try {{
                    const r = await fetch('{json_url}', {{
                        headers: {{ 'Accept': 'application/json' }}
                    }});
                    if (!r.ok) return {{ error: r.status }};
                    return await r.json();
                }} catch(e) {{
                    return {{ error: e.toString() }};
                }}
            }}
        """)

        # Check for errors
        if isinstance(response, dict) and 'error' in response:
            print(f"   ❌ JSON fetch returned error: {response['error']}")
            return parsed_data

        if not isinstance(response, list) or len(response) < 2:
            print(f"   ❌ Unexpected JSON structure.")
            return parsed_data

        # Step 3: Parse the JSON
        main_post  = response[0]['data']['children'][0]['data']
        post_title = main_post.get('title', 'Unknown Title')
        post_body  = main_post.get('selftext', '')

        # Include post body if it has real content
        if post_body and len(post_body) > 15 and post_body not in ['[removed]', '[deleted]']:
            parsed_data.append({
                "title":        post_title,
                "body":         post_body,
                "score":        main_post.get('score', 0),
                "num_comments": main_post.get('num_comments', 0),
                "url":          clean_url,
                "type":         "post",
                "subreddit":    main_post.get('subreddit', ''),
            })

        # Recursively walk all comment levels
        def walk(comments, depth=0):
            if depth > 6:
                return
            for c in comments:
                if len(parsed_data) >= max_comments:
                    return
                if c.get('kind') == 't1':
                    body = c['data'].get('body', '')
                    if body and len(body) > 15 and body not in ['[removed]', '[deleted]']:
                        parsed_data.append({
                            "title":        post_title,
                            "body":         body,
                            "score":        c['data'].get('score', 0),
                            "num_comments": 0,
                            "url":          clean_url,
                            "type":         "comment",
                            "subreddit":    main_post.get('subreddit', ''),
                        })
                    replies = c['data'].get('replies', '')
                    if isinstance(replies, dict):
                        walk(replies['data']['children'], depth + 1)

        walk(response[1]['data']['children'])
        print(f"   ✅ Extracted {len(parsed_data)} items from thread.")

    except Exception as e:
        print(f"   ❌ Extraction error: {e}")

    return parsed_data


# ── MAIN FETCH FUNCTIONS ──────────────────────────────────────────────────────

def fetch_reddit_search(topic, limit=5):
    """
    1. Uses Serper.dev to find Reddit thread URLs via Google Search.
    2. Uses a stealth Playwright browser to scrape each thread's comments.
    """
    print(f"\n🚀 OpinionLens Scraper starting for: '{topic}'")
    print("=" * 55)

    # Step 1: Find Reddit URLs via Serper
    print("🔍 Searching for Reddit threads via Serper.dev...")
    urls = _search_via_serper(topic, limit)

    if not urls:
        print("❌ No Reddit threads found. Check your SERPER_API_KEY in .env")
        return None

    print(f"\n🔗 Scraping {len(urls)} threads with headless browser...")
    print("-" * 55)

    # Step 2: Scrape each thread
    all_data = []
    with sync_playwright() as p:
        browser, context = _make_browser(p)
        page = context.new_page()

        for i, url in enumerate(urls, 1):
            label = url.split('/comments/')[-1].split('/')[0] if '/comments/' in url else url[:40]
            print(f"   [{i}/{len(urls)}] {label}...")
            items = _scrape_reddit_post(page, url)
            all_data.extend(items)
            time.sleep(random.uniform(1.5, 3.0))

        browser.close()

    if not all_data:
        print("❌ Could not extract comments from any thread.")
        return None

    df = pd.DataFrame(all_data)
    df.drop_duplicates(subset=['body'], inplace=True)
    df = df[df['body'].str.len() > 15]
    df.reset_index(drop=True, inplace=True)

    print(f"\n✅ Done! Collected {len(df)} clean, unique comments.")
    print("=" * 55)
    return df


def fetch_reddit_comments(post_url):
    """Fetches comments from a specific Reddit post URL. Used by /api/analyze-link."""
    print(f"\n🔗 Fetching specific post: {post_url[:70]}...")

    all_data = []
    with sync_playwright() as p:
        browser, context = _make_browser(p)
        page = context.new_page()
        all_data = _scrape_reddit_post(page, post_url, max_comments=60)
        browser.close()

    if not all_data:
        print("⚠️ No usable comments found.")
        return None

    df = pd.DataFrame(all_data)
    df.drop_duplicates(subset=['body'], inplace=True)
    df = df[df['body'].str.len() > 15]
    df.reset_index(drop=True, inplace=True)

    print(f"✅ Extracted {len(df)} comments.")
    return df