# OpinionLens

# OpinionLens AI 👁️

> **Enterprise Market Intelligence & Neural Sentiment Analysis Platform (v4.0)**

OpinionLens AI is a powerful, real-time analytics dashboard that extracts, analyzes, and visualizes consumer sentiment across the internet. By combining stealth web scraping with local neural networks and cloud-based Large Language Models, it transforms scattered product reviews and social discussions into highly actionable market intelligence.

---

## 🚀 Project Status

> **✅ Actively maintained and production-ready.**

OpinionLens v4.0 has successfully implemented advanced anti-bot evasion techniques (Googlebot exploits, stealth Playwright contexts) and real-time WebSocket streaming for a seamless user experience.

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-UI%20Dashboard-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Flask-Backend-000000?style=for-the-badge&logo=flask&logoColor=white" />
  <img src="https://img.shields.io/badge/PyTorch-Emotion%20Engine-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/WebSocket-Real%20Time-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="WebSockets"/>
  <img src="https://img.shields.io/badge/AI-RoBERTa%20%7C%20GPT--4o-10B981?style=for-the-badge" alt="AI Models"/>
  <img src="https://img.shields.io/badge/Playwright-Stealth%20Scraping-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

# Vision

OpinionLens aims to eliminate the "black box" of consumer feedback. Instead of manually reading thousands of reviews, businesses and consumers can instantly generate comprehensive Aspect-Based Sentiment Analysis (ABSA) reports from any major e-commerce or social platform.

This project emphasizes:
- Unbreakable, stealthy data extraction.
- Edge-to-cloud AI processing pipelines.
- Beautiful, intuitive data visualization.
- Real-time event streaming.

---

# Core Features

- **Universal Smart Router**: Automatically detects and handles URLs from Amazon, Flipkart, Google Play, YouTube (including Shorts), and Reddit.
- **Ironclad Scraping Engines**: 
  - *Amazon*: Bypasses CAPTCHAs and "Dog Pages" using Googlebot spoofing and fallback mechanics.
  - *Flipkart*: Defeats Akamai CDN fingerprinting using headless Chromium and React-lazy-load triggers.
- **Dual-Layer AI Analysis**:
  - *Local Emotion Neural Network*: Runs `roberta-base-go_emotions` locally via PyTorch for fast, private emotion classification.
  - *Cloud LLM Insights*: Uses OpenRouter (GPT-4o-mini) to dynamically generate Aspect-Based Radar Charts and ruthless, punchy executive summaries.
- **Dynamic Visual Engine**: Automatically resolves product names and fetches canonical images via Wikipedia APIs and Unsplash.
- **Market News Integration**: Pulls the latest relevant global news articles to provide context to the sentiment shifts.

---

# Architecture Overview

- **Frontend**: React.js, Recharts (Radar, Pie, Area charts), Tailwind CSS.
- **Backend API**: Flask, Flask-CORS.
- **Live Streaming**: Flask-SocketIO (Threading mode for non-blocking ML inference).
- **Extraction Layer**: BeautifulSoup4, Curl_CFFI, Playwright, YouTube-Comment-Downloader.
- **Intelligence Layer**: Hugging Face Transformers, OpenRouter API, NewsAPI.

---

# Repository Structure

```text
OpinionLens/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── backend/
│   ├── api.py                 # Core routing and WebSocket server
│   ├── analyzer.py            # Local PyTorch RoBERTa & Cloud LLM logic
│   ├── amazon_scraper.py      # Googlebot-spoofed TLS scraper
│   ├── flipkart_scraper.py    # Stealth Playwright scraper
│   ├── playstore_scraper.py   # Direct Google server scraper
│   ├── youtube_scraper.py     # Regex-normalized video & shorts scraper
│   ├── reddit_scraper.py      # Thread and Search API scraper
│   ├── image_fetcher.py       # Wikipedia API / Unsplash visual engine
│   ├── news_engine.py         # Live market news fetcher
│   └── .env                   # API Keys (OpenRouter, NewsAPI, Unsplash)
│
├── README.md
└── requirements.txt


## Quick Start

To get started with OpinionLens, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nexus-being-787/OpinionLens-v4.git
   cd OpinionLens-v4
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   npm start
   ```

## Architecture Diagram

![Architecture Diagram](link_to_architecture_diagram)

## Use Cases
- **Real-time sentiment analysis**
- **User feedback aggregation**
- **Content moderation**

## Troubleshooting

If you face any issues, consider the following tips:
- Ensure all dependencies are installed.
- Check the logs for error messages.
- Refer to the official documentation for guidance.

## Visual Organization

This project uses a modular structure, which enhances maintainability and scalability. Each component is clearly defined and documented for ease of use and understanding.

---