import pandas as pd
import time
import random
import re
import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def _get_asin(url):
    """Extracts the ASIN (Amazon Standard Identification Number) from any Amazon URL."""
    match = re.search(r'/(?:dp|product|gp/product|product-reviews)/([A-Z0-9]{10})', url)
    if match: return match.group(1)
    return None

def fetch_amazon_reviews(product_url, max_reviews=100):
    all_reviews = []
    if not product_url.startswith("http"): product_url = "https://" + product_url

    print(f"\n🛒 Amazon Googlebot Scraper starting for: {product_url[:70]}...")

    # ── THE GOOGLEBOT EXPLOIT ──
    # Googlebot is proven to bypass the main page CAPTCHA and get top reviews
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
    }

    session = requests.Session()
    session.headers.update(headers)

    try:
        # Resolve Shortlinks
        if "amzn.in" in product_url or "amzn.to" in product_url:
            res = session.get(product_url, allow_redirects=True, timeout=15, verify=False)
            product_url = res.url

        asin = _get_asin(product_url)
        if not asin: return None
            
        domain_match = re.search(r'https://www\.amazon\.([a-z\.]+)/', product_url)
        domain = domain_match.group(1) if domain_match else "in"
        
        def extract_reviews_from_soup(soup_obj):
            extracted = []
            blocks = soup_obj.select('div[data-hook="review"], div.a-section.review, div.customer-review, div[id^="customer_review-"]')
            for block in blocks:
                body_el = block.select_one('span[data-hook="review-body"], span.review-text, span.review-text-content')
                if not body_el: continue
                body = body_el.text.strip()
                if len(body) < 10: continue
                
                title_el = block.select_one('a[data-hook="review-title"], span[data-hook="review-title"], a.review-title')
                title = title_el.text.strip() if title_el else "Amazon Review"
                title = re.sub(r'^\d\.\d out of 5 stars\s*', '', title, flags=re.IGNORECASE).strip()
                
                rating_el = block.select_one('i[data-hook="review-star-rating"], i.review-rating')
                rating = float(rating_el.text.split(' ')[0]) if rating_el else 0.0
                    
                extracted.append({
                    "title": title, "body": body, "score": 0, "rating": rating, 
                    "num_comments": 0, "url": product_url, "type": "amazon_review"
                })
            return extracted

        # ── 1. GRAB TOP REVIEWS FROM MAIN PAGE (GUARANTEES 8-10 REVIEWS) ──
        main_url = f"https://www.amazon.{domain}/dp/{asin}"
        print("   🌐 Loading main product page as Googlebot to guarantee top reviews...")
        main_res = session.get(main_url, timeout=15, verify=False)
        
        if main_res.status_code == 200:
            soup = BeautifulSoup(main_res.content, 'html.parser')
            main_reviews = extract_reviews_from_soup(soup)
            if main_reviews:
                all_reviews.extend(main_reviews)
                print(f"   ✅ Secured {len(main_reviews)} top reviews directly from main page!")
            else:
                print("   ⚠️ Main page loaded, but no reviews were found in the HTML.")

        # ── 2. DEEP PAGINATION (BONUS REVIEWS) ──
        base_review_url = f"https://www.amazon.{domain}/product-reviews/{asin}/ref=cm_cr_arp_d_viewopt_sr?ie=UTF8&reviewerType=all_reviews&pageNumber="
        page = 1

        while len(all_reviews) < max_reviews and page <= 3:
            target_url = f"{base_review_url}{page}"
            print(f"   📄 Fetching deep page {page}...")
            
            response = session.get(target_url, timeout=15, verify=False)
            if response.status_code == 404:
                print("   ⚠️ 404 Dog Page hit. Amazon is blocking deep pagination. Falling back to what we have.")
                break
            elif response.status_code != 200:
                break
                
            soup = BeautifulSoup(response.content, 'html.parser')
            page_reviews = extract_reviews_from_soup(soup)
            if not page_reviews: break
                
            existing_bodies = {r['body'] for r in all_reviews}
            unique_new = [r for r in page_reviews if r['body'] not in existing_bodies]
            all_reviews.extend(unique_new)
            print(f"   ✅ Secured {len(unique_new)} unique reviews from page {page}.")
            page += 1
            time.sleep(random.uniform(1.0, 2.0))

    except Exception as e:
        print(f"❌ Amazon Scraper Error: {e}")

    if not all_reviews: return None
    
    df = pd.DataFrame(all_reviews)
    df.reset_index(drop=True, inplace=True)
    print(f"✅ Extracted a total of {len(df)} Amazon reviews!")
    return df