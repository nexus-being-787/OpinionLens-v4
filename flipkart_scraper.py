import pandas as pd
import time
import random
import re
import json
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


def _make_stealth_context(playwright):
    browser = playwright.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-blink-features=AutomationControlled',
              '--disable-dev-shm-usage', '--window-size=1366,768']
    )
    context = browser.new_context(
        viewport={'width': 1366, 'height': 768},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale='en-IN',
        timezone_id='Asia/Kolkata',
        extra_http_headers={
            'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        }
    )
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver',  { get: () => undefined });
        Object.defineProperty(navigator, 'plugins',    { get: () => [1,2,3,4,5] });
        Object.defineProperty(navigator, 'languages',  { get: () => ['en-IN','en-GB','en'] });
        Object.defineProperty(navigator, 'platform',   { get: () => 'Win32' });
        window.chrome = { runtime: {} };
    """)
    return browser, context


def _extract_pid(url: str):
    for pattern in [r'[?&]pid=([A-Za-z0-9]+)', r'/p/([A-Za-z0-9_]{8,})', r'(itm[A-Za-z0-9]{8,})']:
        m = re.search(pattern, url, re.IGNORECASE)
        if m: return m.group(1)
    return None


def _auto_discover_reviews(html: str, product_url: str) -> list[dict]:
    """
    Auto-discovers review blocks by scanning the actual DOM structure
    rather than relying on hardcoded class names that change frequently.
    
    Strategy:
    1. Find star-rating elements (most stable indicator of a review block)
    2. Walk up to their parent container
    3. Extract text content from sibling elements
    """
    soup = BeautifulSoup(html, 'html.parser')
    reviews = []

    # ── METHOD 1: Find via star rating divs ──────────────────────────────────
    # Flipkart always has a colored div with a number (1-5) as the rating
    # These are the most structurally stable elements across UI versions
    rating_candidates = soup.find_all('div', string=re.compile(r'^[1-5](\.[0-9])?$'))
    
    seen_bodies = set()
    
    for rating_el in rating_candidates:
        try:
            # Walk up 3-6 levels to find the review container
            container = rating_el
            for _ in range(6):
                container = container.parent
                if not container: break
                text = container.get_text(separator=' ', strip=True)
                # A review container has substantial text (>50 chars) and the rating
                if len(text) > 80:
                    # Look for review body — longest text block in container
                    paragraphs = container.find_all(['p', 'div', 'span'])
                    body = ''
                    for p in paragraphs:
                        # Only direct text, not nested elements
                        direct_text = p.get_text(separator=' ', strip=True)
                        direct_text = re.sub(r'\s+', ' ', direct_text)
                        direct_text = direct_text.replace('READ MORE', '').strip()
                        if len(direct_text) > len(body) and len(direct_text) < 2000:
                            body = direct_text
                    
                    if len(body) > 30 and body not in seen_bodies:
                        seen_bodies.add(body)
                        try:
                            rating_val = float(rating_el.get_text(strip=True))
                        except:
                            rating_val = 0.0
                        reviews.append({
                            'title': 'Flipkart Review',
                            'body': body,
                            'score': 0,
                            'rating': rating_val,
                            'num_comments': 0,
                            'url': product_url,
                            'type': 'flipkart_review'
                        })
                        break
        except Exception:
            continue

    # ── METHOD 2: JSON-LD structured data (most reliable when present) ────────
    if not reviews:
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                # Handle both single object and list
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get('@type') in ('Product', 'Review'):
                        for review in item.get('review', []) or item.get('reviews', []):
                            body = review.get('reviewBody', '') or review.get('description', '')
                            if len(body) > 10:
                                rating = 0.0
                                try:
                                    rating = float(review.get('reviewRating', {}).get('ratingValue', 0))
                                except:
                                    pass
                                reviews.append({
                                    'title': review.get('name', 'Flipkart Review'),
                                    'body': body, 'score': 0, 'rating': rating,
                                    'num_comments': 0, 'url': product_url,
                                    'type': 'flipkart_review'
                                })
            except Exception:
                continue

    # ── METHOD 3: Window.__INITIAL_STATE__ JS object ──────────────────────────
    if not reviews:
        for script in soup.find_all('script'):
            src = script.string or ''
            if 'reviewDetails' in src or 'userReviews' in src:
                # Extract JSON blob from JS assignment
                match = re.search(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', src, re.DOTALL)
                if match:
                    try:
                        state = json.loads(match.group(1))
                        # Navigate into the state tree to find reviews
                        def find_reviews_in_dict(d, depth=0):
                            if depth > 8 or not isinstance(d, (dict, list)):
                                return
                            if isinstance(d, list):
                                for item in d:
                                    find_reviews_in_dict(item, depth+1)
                            else:
                                for k, v in d.items():
                                    if k in ('reviewBody', 'reviewText', 'comment', 'text') and isinstance(v, str) and len(v) > 20:
                                        reviews.append({
                                            'title': 'Flipkart Review', 'body': v,
                                            'score': 0, 'rating': 0.0,
                                            'num_comments': 0, 'url': product_url,
                                            'type': 'flipkart_review'
                                        })
                                    else:
                                        find_reviews_in_dict(v, depth+1)
                        find_reviews_in_dict(state)
                    except Exception:
                        pass

    # ── METHOD 4: Broad text extraction — any div with 40+ word review-like text
    if not reviews:
        print("   🔍 Falling back to broad text extraction...")
        all_divs = soup.find_all('div')
        for div in all_divs:
            # Only look at leaf-ish divs (not huge containers)
            direct_text = ' '.join(t for t in div.strings if t.strip())
            direct_text = re.sub(r'\s+', ' ', direct_text).strip()
            word_count = len(direct_text.split())
            # Reviews are typically 20-200 words
            if 20 <= word_count <= 200 and direct_text not in seen_bodies:
                # Filter out navigation/UI text
                skip_keywords = ['add to cart', 'buy now', 'wishlist', 'compare', 'offers',
                                 'delivery', 'seller', 'login', 'sign in', 'cart', 'search']
                if any(kw in direct_text.lower() for kw in skip_keywords):
                    continue
                seen_bodies.add(direct_text)
                reviews.append({
                    'title': 'Flipkart Review', 'body': direct_text,
                    'score': 0, 'rating': 0.0, 'num_comments': 0,
                    'url': product_url, 'type': 'flipkart_review'
                })
                if len(reviews) >= 20:
                    break

    return reviews


def fetch_flipkart_reviews(product_url: str, max_reviews: int = 50):
    if not product_url.startswith('http'):
        product_url = 'https://' + product_url

    print(f"\n🛒 Flipkart Scraper starting for: {product_url[:70]}...")

    pid = _extract_pid(product_url)
    if not pid:
        print("❌ Could not find Product ID (PID) in URL.")
        return None
    print(f"   🔑 Product ID: {pid}")

    all_reviews = []

    with sync_playwright() as p:
        browser, context = _make_stealth_context(p)
        page = context.new_page()

        try:
            # Step 1: Load product page (gets cookies + embedded reviews)
            print("   🌐 Loading product page...")
            page.goto(product_url, wait_until='domcontentloaded', timeout=30000)
            time.sleep(random.uniform(2.5, 4.0))

            # Scroll down to trigger lazy-loaded review section
            page.evaluate("window.scrollTo(0, document.body.scrollHeight * 0.6)")
            time.sleep(1.5)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2.0)

            html = page.content()
            embedded = _auto_discover_reviews(html, product_url)
            if embedded:
                print(f"   ✅ {len(embedded)} reviews found in product page.")
                all_reviews.extend(embedded)

            # Step 2: Try the dedicated review page
            base_clean = re.sub(r'/p/', '/product-reviews/', product_url.split('?')[0])
            
            for pg in range(1, 6):
                if len(all_reviews) >= max_reviews:
                    break

                review_url = f"{base_clean}?pid={pid}&page={pg}&sortOrder=MOST_HELPFUL"
                print(f"   📄 Review page {pg}...")
                page.goto(review_url, wait_until='domcontentloaded', timeout=25000)
                time.sleep(random.uniform(2.0, 3.5))

                # Check for login wall
                if 'login' in page.url.lower():
                    print("   ⚠️ Redirected to login. Stopping.")
                    break

                # Scroll to load all reviews
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(1.5)

                html = page.content()

                # Debug: save class names of divs for diagnosis
                soup_debug = BeautifulSoup(html, 'html.parser')
                all_classes = set()
                for div in soup_debug.find_all('div', class_=True):
                    for c in div.get('class', []):
                        all_classes.add(c)
                print(f"   🔎 Found {len(all_classes)} unique CSS classes on page.")

                pg_reviews = _auto_discover_reviews(html, product_url)
                
                if not pg_reviews:
                    print(f"   ℹ️ No reviews extracted from page {pg}.")
                    if pg == 1:
                        # Save HTML snapshot for debugging
                        with open('flipkart_debug.html', 'w', encoding='utf-8') as f:
                            f.write(html)
                        print("   💾 Saved flipkart_debug.html — check this file to see what Flipkart returned.")
                    break

                existing = {r['body'] for r in all_reviews}
                new = [r for r in pg_reviews if r['body'] not in existing]
                if not new:
                    print(f"   ℹ️ All reviews on page {pg} are duplicates.")
                    break

                all_reviews.extend(new)
                print(f"   ✅ Page {pg}: +{len(new)} reviews (total: {len(all_reviews)})")
                time.sleep(random.uniform(1.5, 2.5))

        except PlaywrightTimeout as e:
            print(f"   ⏳ Timeout: {e}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        finally:
            browser.close()

    if not all_reviews:
        print("⚠️ No reviews extracted.")
        print("💡 Check flipkart_debug.html in your project folder to see what Flipkart returned.")
        return None

    df = pd.DataFrame(all_reviews)
    df.drop_duplicates(subset=['body'], inplace=True)
    df = df[df['body'].str.len() > 20]
    df.reset_index(drop=True, inplace=True)
    print(f"✅ Total: {len(df)} unique Flipkart reviews!")
    return df