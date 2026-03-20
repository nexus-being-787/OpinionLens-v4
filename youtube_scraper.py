import pandas as pd
import re
from youtube_comment_downloader import YoutubeCommentDownloader, SORT_BY_POPULAR

def _extract_video_id(url):
    """
    Extracts the 11-character video ID from ANY YouTube URL format:
    - Standard: youtube.com/watch?v=ID
    - Mobile: youtu.be/ID
    - Shorts: youtube.com/shorts/ID
    - Embeds: youtube.com/embed/ID
    """
    match = re.search(r'(?:v=|/v/|youtu\.be/|/shorts/|/embed/)([a-zA-Z0-9_-]{11})', url)
    if match:
        return match.group(1)
    return None

def fetch_youtube_comments(url, max_comments=150):
    """Scrapes YouTube comments and seamlessly handles YouTube Shorts URLs."""
    print(f"\n🎥 YouTube Scraper starting for: {url}")
    
    # 1. Extract the raw Video ID
    video_id = _extract_video_id(url)
    if not video_id:
        print("   ❌ Invalid or unrecognized YouTube URL format.")
        return None
        
    print(f"   🔑 Target Video ID: {video_id}")
    
    # 2. Normalize the URL to the classic format the library expects
    standard_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"   🔗 Normalized URL: {standard_url}")
    
    downloader = YoutubeCommentDownloader()
    
    try:
        print("   📥 Downloading comments (this may take a few seconds)...")
        # Get comments generator
        comments_gen = downloader.get_comments_from_url(standard_url, sort_by=SORT_BY_POPULAR)
        
        all_comments = []
        count = 0
        
        for comment in comments_gen:
            if count >= max_comments:
                break
            
            body = comment.get('text', '')
            if len(body) > 10:
                all_comments.append({
                    "title": comment.get('author', 'YouTube User'),
                    "body": body.replace('\n', ' '), # Clean up multiline comments for the AI
                    "score": comment.get('votes', 0), # Upvotes
                    "rating": 0.0, # YouTube doesn't do 5-star ratings
                    "num_comments": 0,
                    "url": standard_url,
                    "type": "youtube_comment"
                })
                count += 1
        
        if not all_comments:
            print("   ⚠️ No comments found or comments are disabled for this video.")
            return None
            
        df = pd.DataFrame(all_comments)
        print(f"   ✅ Successfully extracted {len(df)} YouTube comments.")
        return df
        
    except Exception as e:
        print(f"❌ YouTube Scraper Error: {e}")
        return None