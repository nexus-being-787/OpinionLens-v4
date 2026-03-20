# 📡 OpinionLens AI v4.0
**Enterprise Market Intelligence & Neural Sentiment Analysis Dashboard**

OpinionLens is a Hybrid-AI intelligence platform that seamlessly bypasses corporate anti-bot walls to turn scattered, multi-platform customer reviews into dynamic, highly visual market research reports in seconds.

Instead of generic "positive/negative" scores, OpinionLens uses a dual-neural-engine architecture to dynamically identify specific product aspects (Battery, Pricing, UI) and grades them on an interactive radar chart, capped off with an LLM-generated executive summary.

![OpinionLens v4 Dashboard Preview](https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop)

## ✨ Core Innovations
* **Omnichannel Stealth Extraction:** Bypasses enterprise anti-bot walls to pull live reviews from Amazon, Flipkart, Google Play Store, YouTube, and Reddit using just a single URL. Features graceful degradation if anti-bot walls are triggered.
* **Dynamic Aspect-Based Sentiment Analysis (ABSA):** Automatically identifies specific product traits (like "Battery Life" or "Pricing") using zero-shot classification and grades them dynamically.
* **Hybrid AI Architecture:** Merges a blazing-fast local neural network (**RoBERTa**) for instant emotion tagging with a deep-lane model (**DeBERTa v3 Large**) for aspect extraction, and a Cloud LLM (**GPT-4o-mini**) for executive summaries.
* **Head-to-Head Versus Engine:** Pits two competitor URLs against each other to instantly generate side-by-side AI verdicts, Trust Scores, and feature-strength comparisons.
* **Real-Time Live Stream:** Powered by WebSockets, the UI updates in real-time as the scrapers bypass pagination and the neural engines crunch the data.
* **One-Click Professional Reporting:** Instantly captures the interactive React dashboard and exports it as a clean, styled PDF report.

## 🛠️ Tech Stack
**Frontend:**
* React + Vite
* Tailwind CSS v4
* Recharts (Radar, Pie, Area) & Lucide Icons
* Socket.io-client
* html2canvas & jsPDF (Export Engine)

**Backend:**
* Python 3.10+ (Linux Optimized)
* Flask + Flask-SocketIO + Flask-CORS
* PyTorch + Hugging Face `transformers`
* BeautifulSoup4 (Scraping)
* OpenRouter API (LLM Reasoning Layer)

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* Python (3.8 - 3.12)
* An [OpenRouter](https://openrouter.ai/) API Key
* A [NewsAPI](https://newsapi.org/) Key (Optional, for market news)

### 1. Backend Setup (Terminal 1)
Clone the repository and navigate into it:
```bash
git clone https://github.com/nexus-being-787/OpinionLens-v4.git
cd OpinionLens
```

Create and activate a virtual environment:

```bash
# On macOS/Linux (Recommended)
python3 -m venv venv
source venv/bin/activate

# On Windows
python -m venv venv
venv\Scripts\activate
```

Install the required heavy AI and scraping dependencies:

```bash
pip install flask flask-cors flask-socketio pandas beautifulsoup4 transformers torch requests python-dotenv
# Note: Ensure PyTorch is compatible with your NumPy version (numpy<2 may be required for older PyTorch versions)
```

Create a .env file in the root directory and add your API keys:

```bash
OPENROUTER_API_KEY=your_openrouter_key_here
NEWSAPI_KEY=your_newsapi_key_here
```

Start the Python Neural Engine Server:

```bash
python api.py
# NOTE: The first run will download the RoBERTa and DeBERTa v3 models (~1.5GB). Please allow a few minutes for "Neural Engines Online!" to appear.
```

## 2. Frontend Setup (Terminal 2)

Open a new terminal, navigate to the frontend folder, and install the Node modules:

```bash
cd frontend
npm install

npm run dev
```

The application will automatically open in your default web browser at http://localhost:5173.

## 🧩 Architecture Breakdown

* `api.py`: The master Flask routing engine, WebSocket streamer, and graceful-fallback handler.
* `analyzer.py`: The Dual-Brain AI layer. Routes fast sentiment to RoBERTa, routes deep ABSA to DeBERTa, and queries GPT-4o-mini for summaries.
* `amazon_scraper.py`, `flipkart_scraper.py`, etc.: Custom stealth extraction engines tailored to specific e-commerce and social platforms.
* `frontend/src/App.jsx`: The monolithic React dashboard managing active modes (Single vs. Compare), WebSocket listeners, and PDF generation.

## 📌 Important Notes

* Hardware: Running DeBERTa v3 Large locally requires decent CPU/RAM allocation. It is highly optimized for Linux environments.
* IP Reputation: Heavy scraping of Amazon/Flipkart from Datacenter IPs (like Google Colab) may trigger CAPTCHAs. The system is designed to gracefully fall back to dummy data if blocked, preventing UI crashes.

***

Ready to test the live app now? (Yes!)

