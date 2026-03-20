# 📡 OpinionLens (Reddit Radar AI)

**Advanced Brand Sentiment & Market Intelligence System**

OpinionLens (aka Reddit Radar AI) is a powerful intelligence tool that aggregates and analyzes community discussions from Reddit and other sources to provide actionable business insights. Built with Python, it includes scrapers, sentiment analysis, result aggregation, and an interactive Streamlit dashboard.

---

## ✨ Features

- 🔍 Brand / topic search on Reddit (and other sources).
- 🔗 Optional link-specific analysis via URL / comments text.
- 🧠 AI sentiment classification (Positive / Neutral / Negative).
- 📊 Buy Confidence / sentiment report scoring.
- 🔑 Keyword extraction, themes, and pros/cons summaries.
- 📈 Dashboard visualizations (Plotly + Streamlit).
- 🐍 Multiple scraper backends for Amazon, Flipkart, YouTube, Play Store, Reddit, and more.

## 🚀 Getting Started

### Prerequisites

- Python 3.8+ (recommend 3.10+)
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (for frontend, optional)

### Installation

1. **Clone your repo:**
   ```bash
   git clone https://github.com/nexus-being-787/OpinionLens-v4.git
   cd OpinionLens
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   If `requirements.txt` is missing, install core packages:
   ```bash
   pip install streamlit pandas plotly praw requests beautifulsoup4 transformers torch
   ```

4. **Ignore large local model files** (not pushed to GitHub):
   - `my_local_model/model.safetensors` excluded due GitHub file size limits.

### Running the Streamlit App

```bash
streamlit run app.py
```

Open `http://localhost:8501` in your browser.

---

## 🧩 Additional scripts

- `scraper.py`, `reddit_scraper.py`, `amazon_scraper.py`, `flipkart_scraper.py`, `playstore_scraper.py`, `youtube_scraper.py`, `apify_scraper.py`, `news_engine.py`: scraping engines.
- `analyzer.py`: sentiment aggregation and scoring.
- `api.py`: REST API wrapper.
- `frontend/`: Vue/Vite UI with own package setup.

---

## 📌 Note

- You may need Git LFS for model checkpoints >100MB.
- For immediate testing without model files, use sample data or disable model-dependent features.

---

## 🛠️ Built With

- Streamlit
- Plotly
- Python
2. **Set up a virtual environment (Recommended):**
   ```bash
   # On Windows
   python -m venv venv
   venv\Scripts\activate
   
   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install the required dependencies:**
   ```bash
   pip install streamlit pandas plotly praw
   # (Add additional dependencies from your environment as needed)
   ```

### Running the Application

Start the Streamlit development server:

```bash
streamlit run app.py
```

The application will automatically open in your default web browser at `http://localhost:8501`.

## 🛠️ Built With

- **[Streamlit](https://streamlit.io/)** - The web framework used for the interactive UI.
- **[Plotly](https://plotly.com/python/)** - For dynamic data visualization.
- **Python** - Core logic, scraping, and sentiment analysis.