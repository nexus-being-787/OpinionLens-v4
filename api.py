import os
import traceback
import pandas as pd
import urllib.parse
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from dotenv import load_dotenv

# ── LOAD ENVIRONMENT VARIABLES ──
load_dotenv()

# ── IMPORT CUSTOM ENGINES ──
import analyzer
import amazon_scraper
import flipkart_scraper
import playstore_scraper
import youtube_scraper
import reddit_scraper
import news_engine 
import image_fetcher 

# ── INITIALIZE FLASK & SOCKETIO ──
app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app, 
    cors_allowed_origins="*", 
    async_mode="threading",
    ping_timeout=120,
    ping_interval=25
)

print("🚀 Starting OpinionLens v4.0 on http://localhost:5000")

def extract_name_from_url(url):
    """Secretly extracts the product name directly from the URL text."""
    try:
        path = urllib.parse.urlparse(url).path
        parts = path.split('/')
        for p in parts:
            if len(p) > 10 and '-' in p and 'product-reviews' not in p and 'details' not in p:
                return p.replace('-', ' ').title()
    except: pass
    return None

def extract_data_from_source(topic_or_url):
    """Universal router with smart URL Title Extraction."""
    target = topic_or_url.lower().strip()
    df, p_info = None, None
    source, category = "Unknown", "General"

    try:
        extracted_title = extract_name_from_url(topic_or_url)

        # 1. URL ROUTING
        if "http" in target or "www." in target:
            if "play.google.com" in target:
                df, p_info = playstore_scraper.fetch_playstore_reviews(topic_or_url, max_reviews=150)
                source, category = "Google Play Store", "Software/App"
            elif "flipkart.com" in target:
                df = flipkart_scraper.fetch_flipkart_reviews(topic_or_url, max_reviews=100)
                source, category = "Flipkart", "Product/Brand"
            elif "amazon." in target or "amzn." in target:
                df = amazon_scraper.fetch_amazon_reviews(topic_or_url, max_reviews=100)
                source, category = "Amazon", "Product/Brand"
            elif "reddit.com" in target:
                df = reddit_scraper.scrape_reddit_thread(topic_or_url)
                source, category = "Reddit Thread", "General Discussion"
            elif "youtube.com" in target or "youtu.be" in target:
                df = youtube_scraper.fetch_youtube_comments(topic_or_url, max_comments=150)
                source, category = "YouTube", "Video Feedback"

            if not p_info:
                final_title = extracted_title if extracted_title else f"{source} Analysis"
                p_info = {"title": final_title, "category": category, "description": f"Verified data from {source}."}

        # 2. KEYWORD SEARCH
        else:
            df = reddit_scraper.search_reddit(topic_or_url, max_results=100)
            source, category = "Reddit Search", "Market Search"
            p_info = {"title": topic_or_url.title(), "category": category, "description": "Aggregated community sentiment."}

        # 3. SMART IMAGE INJECTION
        if p_info and not p_info.get("image"):
            search_term = p_info.get("title") if source != "Reddit Search" else topic_or_url
            p_info["image"] = image_fetcher.fetch_topic_image(search_term)

        return df, p_info, source, category

    except Exception as e:
        print(f"❌ Extraction Router Error: {traceback.format_exc()}")
        return None, None, "Error", "General"

def get_fallback_dataframe(url):
    """Generates a graceful fallback dataframe if the scraper gets blocked by a CAPTCHA."""
    return pd.DataFrame([{
        "title": "Anti-Bot Wall Hit", 
        "body": "The scraper was temporarily blocked by the store's anti-bot protection, or this newly released product currently has 0 written reviews.", 
        "score": 0, 
        "rating": 3.0, 
        "num_comments": 0, 
        "url": url, 
        "type": "fallback"
    }])

# ═════════════════════════════════════════════════════════════════════════════
# 📡 HTTP ENDPOINTS
# ═════════════════════════════════════════════════════════════════════════════
@app.route('/api/amazon', methods=['POST', 'OPTIONS'])
def analyze_single():
    if request.method == 'OPTIONS': return '', 200
    url = request.json.get('url', '')
    if not url: return jsonify({"error": "URL/Topic is required."}), 400

    df, p_info, source, cat = extract_data_from_source(url)
    
    # NEW: Graceful fallback instead of crashing
    if df is None or df.empty:
        df = get_fallback_dataframe(url)
        p_info = p_info or {"title": "Unknown Product", "category": "General", "image": ""}

    df, absa, tldr, rec = analyzer.run_analysis(df, category=cat)
    news = news_engine.fetch_product_news(p_info['title'])

    return jsonify({"data": df.to_dict(orient='records'), "product_info": p_info, "absa": absa, "tldr": tldr, "recommendation": rec, "news": news})

@app.route('/api/compare', methods=['POST', 'OPTIONS'])
def compare_products():
    if request.method == 'OPTIONS': return '', 200
    url1, url2 = request.json.get('url1', ''), request.json.get('url2', '')
    if not url1 or not url2: return jsonify({"error": "Both inputs required."}), 400

    df1, p_info1, src1, cat1 = extract_data_from_source(url1)
    df2, p_info2, src2, cat2 = extract_data_from_source(url2)

    # NEW: Graceful fallback for Versus mode!
    if df1 is None or df1.empty:
        df1 = get_fallback_dataframe(url1)
        p_info1 = p_info1 or {"title": extract_name_from_url(url1) or "Product 1", "category": "Blocked", "image": ""}
    if df2 is None or df2.empty:
        df2 = get_fallback_dataframe(url2)
        p_info2 = p_info2 or {"title": extract_name_from_url(url2) or "Product 2", "category": "Blocked", "image": ""}

    df1, absa1, tldr1, rec1 = analyzer.run_analysis(df1, category=cat1)
    df2, absa2, tldr2, rec2 = analyzer.run_analysis(df2, category=cat2)

    news1 = news_engine.fetch_product_news(p_info1['title'])
    news2 = news_engine.fetch_product_news(p_info2['title'])

    return jsonify({
        "product1": {"data": df1.to_dict(orient='records'), "product_info": p_info1, "absa": absa1, "tldr": tldr1, "recommendation": rec1, "news": news1},
        "product2": {"data": df2.to_dict(orient='records'), "product_info": p_info2, "absa": absa2, "tldr": tldr2, "recommendation": rec2, "news": news2}
    })

# ═════════════════════════════════════════════════════════════════════════════
# ⚡ WEBSOCKET REAL-TIME STREAMING
# ═════════════════════════════════════════════════════════════════════════════
@socketio.on('start_analysis')
def handle_stream_request(data):
    topic = data.get('topic')
    client_id = request.sid
    if not topic: return
    
    print(f"\n🔌 WebSocket analysis started for '{topic}'")

    def _stream_job():
        try:
            socketio.emit('status', {'message': 'Initializing extraction engines...'}, to=client_id)
            df, p_info, source, category = extract_data_from_source(topic)

            if df is None or df.empty:
                df = get_fallback_dataframe(topic)
                socketio.emit('status', {'message': '⚠️ Site blocked scraper. Using fallback data.'}, to=client_id)
            else:
                socketio.emit('status', {'message': f'✅ Secured {len(df)} data points from {source}.'}, to=client_id)
            
            for text in df['body'].head(4):
                socketio.emit('comment_preview', {'body': str(text)}, to=client_id)
                socketio.sleep(0.2)

            socketio.emit('status', {'message': '🧠 Initializing Neural Emotion Analysis & OpenRouter LLM...'}, to=client_id)
            df, absa_report, tldr, recommendation = analyzer.run_analysis(df, category=category)
            
            socketio.emit('status', {'message': '📰 Aggregating relevant market news...'}, to=client_id)
            news_articles = news_engine.fetch_product_news(p_info['title'])
            
            socketio.emit('status', {'message': '✅ Analysis complete! Packaging dashboard...'}, to=client_id)
            socketio.emit('complete', {
                'data': df.to_dict(orient='records'), 'absa': absa_report, 'tldr': tldr,
                'recommendation': recommendation, 'product_info': p_info, 'news': news_articles
            }, to=client_id)

        except Exception as e:
            print(f"❌ WebSocket Pipeline Error: {traceback.format_exc()}")
            socketio.emit('error', {'message': f'Pipeline failed: {str(e)}'}, to=client_id)

    socketio.start_background_task(_stream_job)

if __name__ == '__main__':
    socketio.run(app, debug=True, use_reloader=False, port=5000, allow_unsafe_werkzeug=True)