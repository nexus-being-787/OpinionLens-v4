import os
import json
import torch
import requests
import pandas as pd
from transformers import pipeline
from dotenv import load_dotenv

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

print("⏳ Loading Fast Emotion Model (RoBERTa)...")
emotion_classifier = pipeline("text-classification", model="SamLowe/roberta-base-go_emotions", top_k=1, device=-1)

print("⏳ Loading Deep Aspect Model (DeBERTa v3 Large)...")
absa_classifier = pipeline("zero-shot-classification", model="MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli", device=-1)

print("✅ Neural Engines Online!")

EMOTION_MAP = {
    'admiration': '🤩', 'amusement': '😂', 'approval': '👍', 'caring': '🥰', 'desire': '🔥',
    'excitement': '🎉', 'gratitude': '🙏', 'joy': '😊', 'love': '❤️', 'optimism': '✨',
    'anger': '😡', 'annoyance': '😒', 'disappointment': '😞', 'disapproval': '👎', 'disgust': '🤢',
    'fear': '😨', 'sadness': '😢', 'confusion': '🤔', 'curiosity': '🧐', 'surprise': '😲',
    'neutral': '😐', 'nervousness': '😬', 'relief': '😌', 'pride': '😎', 'grief': '🥀',
    'remorse': '😔', 'embarrassment': '😳', 'realization': '💡'
}

POSITIVE_EMOTIONS = ['admiration', 'amusement', 'approval', 'caring', 'desire', 'excitement', 'gratitude', 'joy', 'love', 'optimism', 'pride', 'relief']
NEGATIVE_EMOTIONS = ['anger', 'annoyance', 'disappointment', 'disapproval', 'disgust', 'fear', 'sadness', 'grief', 'remorse', 'embarrassment', 'nervousness']

CATEGORY_ASPECTS = {
    "Product/Brand": {"Battery Life": "🔋", "Pricing/Value": "💰", "Build Quality": "🏗️", "Performance": "⚡", "Customer Service": "🎧"},
    "Software/App":  {"User Interface": "📱", "Performance/Bugs": "🐛", "Pricing/Ads": "💸", "Features": "✨", "Customer Support": "🎧"},
    "Video Feedback":{"Content Quality": "🎬", "Host/Presenter": "🎙️", "Pacing/Length": "⏱️", "Audio/Visuals": "📺", "Accuracy": "🎯"},
    "General":       {"Value": "💎", "Quality": "⭐", "Reliability": "🛡️", "Design": "🎨", "Support": "🤝"}
}


def analyze_aspects(comments, category):
    aspect_map = CATEGORY_ASPECTS.get(category, CATEGORY_ASPECTS["General"])
    aspect_names = list(aspect_map.keys())

    hypothesis_template = "The sentiment regarding the {} is positive."
    aspect_scores = {aspect: {"positive_hits": 0, "total_mentions": 0} for aspect in aspect_names}

    for comment in comments:
        short_comment = comment[:250]
        try:
            output = absa_classifier(
                short_comment,
                aspect_names,
                hypothesis_template=hypothesis_template,
                multi_label=True
            )
            for aspect, score in zip(output['labels'], output['scores']):
                if score > 0.60:
                    aspect_scores[aspect]["positive_hits"] += 1
                    aspect_scores[aspect]["total_mentions"] += 1
                elif score < 0.40:
                    aspect_scores[aspect]["total_mentions"] += 1
        except Exception:
            continue

    absa_report = []
    for aspect, data in aspect_scores.items():
        pct = 50
        if data["total_mentions"] > 0:
            pct = int((data["positive_hits"] / data["total_mentions"]) * 100)

        absa_report.append({
            "aspect": aspect,
            "positive_pct": pct,
            "emoji": aspect_map[aspect]
        })

    return absa_report


def get_opinion_reasoning(absa_report, top_comments):
    if not OPENROUTER_API_KEY:
        return (
            "Connect your OpenRouter API key to unlock the AI Executive Summary.",
            "Check the aspect radar for detailed community metrics."
        )

    stats_str = ", ".join([f"{a['aspect']}: {a['positive_pct']}% Positive" for a in absa_report])
    comments_str = "\n".join(top_comments[:5])

    prompt = f"""
You are a ruthless, highly accurate market analyst. Review this product data.
Aspect Scores: {stats_str}
Top Comments: {comments_str}

Respond STRICTLY in JSON format with exactly these two keys:
{{
    "tldr": "A punchy, 2-3 sentence executive summary explaining exactly WHY the community likes or hates this product.",
    "recommendation": "A bold, 1-sentence final verdict."
}}
Do not use markdown blocks. Just return the raw JSON text.
"""

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=10
        )
        data = response.json()
        content = data['choices'][0]['message']['content'].strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        parsed = json.loads(content)
        return parsed.get("tldr", "No summary available."), parsed.get("recommendation", "No recommendation available.")

    except Exception as e:
        print(f"⚠️ OpenRouter error: {e}")
        return (
            "AI summary unavailable — check your OpenRouter API key and connection.",
            "Manual review recommended based on the aspect scores above."
        )


def run_analysis(df, category="General"):
    """Main entry point: runs emotion + ABSA analysis on a DataFrame."""
    if df is None or df.empty:
        return df, [], "No data available.", "N/A"

    bodies = df['body'].fillna('').tolist()

    # ── Emotion classification ────────────────────────────────────────────
    print(f"⚡ Running Local Neural Emotion Analysis on {len(bodies)} comments...")
    emotions, emojis, sentiments = [], [], []

    for text in bodies:
        try:
            result = emotion_classifier(text[:512])[0]
            label = result['label']
            emotions.append(label)
            emojis.append(EMOTION_MAP.get(label, '😐'))
            if label in POSITIVE_EMOTIONS:
                sentiments.append('Positive')
            elif label in NEGATIVE_EMOTIONS:
                sentiments.append('Negative')
            else:
                sentiments.append('Neutral')
        except Exception:
            emotions.append('neutral')
            emojis.append('😐')
            sentiments.append('Neutral')

    df['emotion']   = emotions
    df['emoji']     = emojis
    df['sentiment'] = sentiments
    print("✅ Local Emotion Analysis Complete!")

    # ── ABSA & Reasoning classification ───────────────────────────────────
    print("   🧠 Running Deep Aspect Extraction (DeBERTa)...")
    top_comments = df.sort_values(by='score', ascending=False)['body'].head(20).tolist()
    absa_report = analyze_aspects(top_comments, category)

    print("   🤖 Requesting Opinion Reasoning from OpenRouter...")
    tldr, rec = get_opinion_reasoning(absa_report, top_comments)

    return df, absa_report, tldr, rec