# NSE Options Probability Intelligence Platform

> **AI-powered, local-first web application that automatically downloads NSE derivatives historical data, runs analytics, and identifies the statistically optimal CE/PE selling bands for indices and F&O stocks.**

---

## 🎯 What This Platform Does

- **Automatically downloads** NSE F&O bhavcopy and equity data daily (after market close)
- **Analyzes 169 CE/PE combinations** (1%–20% OTM) across all historical weekly/monthly expiries
- **Computes risk metrics**: Sharpe, Sortino, Calmar, Max Drawdown, Kelly Criterion, win rate
- **Segments results by market regime**: Bull/Bear/Sideways × Low/Medium/High VIX
- **Generates daily recommendations** for all 190+ F&O stocks + 5 indices
- **AI chatbot** answers natural language questions about your data (SQL agent + RAG)
- **Real-time alerts** via Telegram, in-app notifications

---

## 📊 Dashboards

| Dashboard | Description |
|-----------|-------------|
| Overview | Summary metrics, top picks, VIX indicator |
| Weekly Index | NIFTY/BANKNIFTY weekly CE/PE recommendations |
| Monthly Index | Monthly index selling bands with Sharpe ratios |
| F&O Stocks | 190+ stocks ranked by expected return |
| Band Explorer | Interactive 13×13 CE/PE heatmap |
| Opportunity Scanner | Real-time ranked opportunities with filters |
| Risk Dashboard | Drawdown charts, distribution, comparative risk |
| AI Chat | Ask anything about your options data |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js 15 + React 19)                        │
│  Recharts · Glassmorphism UI · Dark Theme               │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / Nginx reverse proxy
┌────────────────────▼────────────────────────────────────┐
│  FastAPI (Python 3.12 + SQLAlchemy 2.0 async)           │
│  Auth · Dashboard · Analytics · Scanner · Chat APIs     │
└──────┬─────────────────┬──────────────────┬─────────────┘
       │                 │                  │
  PostgreSQL          Redis             Qdrant
  (TimescaleDB)   (Celery broker)    (Vector store)
       │
  Celery Worker ──► Daily ingestion ──► NSE Archives
  Celery Beat  ──► Scheduled at 6PM IST weekdays
       │
  Ollama / OpenAI  (LLM for chatbot)
```

---

## 🚀 Quick Start

### Prerequisites
- **Docker Desktop** (Windows/Mac) or Docker + Docker Compose (Linux)
- **8 GB RAM** minimum (16 GB recommended for Ollama)
- **20 GB disk space** (for historical data + models)

### 1. Clone and Configure

```powershell
git clone <repo-url>
cd "NSE Analysis"
Copy-Item .env.example .env
# Edit .env — set at minimum: POSTGRES_PASSWORD, APP_SECRET_KEY
notepad .env
```

### 2. Start Everything (Windows)

```powershell
.\start.ps1
```

Or manually:

```powershell
docker-compose up -d
```

### 3. Access the Platform

| Service | URL |
|---------|-----|
| Dashboard | http://localhost |
| API Docs | http://localhost:8000/api/docs |
| Health | http://localhost:8000/health |
| Qdrant UI | http://localhost:6333/dashboard |
| Flower (Celery) | http://localhost:5555 |

---

## 📥 Data Backfill

Download historical data (requires NSE website access):

```bash
# Via docker exec
docker-compose exec backend python -c "
from app.scheduler.jobs import backfill_data
backfill_data.delay('2019-01-01', '2024-12-31')
"

# Monitor progress
docker-compose logs -f celery-worker
```

**Note**: NSE rate-limits downloads. The backfill uses ~1 req/sec with exponential retry. A full 5-year backfill takes ~2–3 hours.

---

## 🤖 AI Chatbot Setup

The chatbot uses **Ollama** (local, free) by default.

```bash
# Pull the LLM model (run once)
docker-compose exec ollama ollama pull llama3.1

# Verify
docker-compose exec ollama ollama list
```

**To use OpenAI instead:**
```env
# In .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

**Example questions to ask the AI:**
- "What is the optimal CE% for NIFTY weekly expiries?"
- "Which stocks have the highest win rate for option selling?"
- "Show me BANKNIFTY performance when VIX is above 20"
- "What PE% had the highest probability of expiring worthless?"

---

## 📈 How the Analytics Works

### Step 1: Data Collection
Every weekday at 6 PM IST, the Celery pipeline:
1. Downloads F&O bhavcopy from `nsearchives.nseindia.com`
2. Downloads equity bhavcopy for spot prices
3. Fetches India VIX
4. Stores all data in PostgreSQL (upsert, dedup by unique constraints)

### Step 2: P&L Computation
For each historical expiry and each of the **169 CE/PE combinations** (13 CE × 13 PE):
- Finds the nearest available strike at X% OTM from spot at entry
- Records the entry premium (sold) and expiry premium (remaining value)
- Computes: `P&L = Entry Premium - Expiry Premium`
- Flags whether each option expired worthless (≤ ₹0.05)

### Step 3: Band Optimization
Optimizes across:
- **4 analysis periods**: 3M, 6M, 1Y, 2Y, All-time
- **3 VIX regimes**: Low (<15), Medium (15–25), High (>25)
- **3 market regimes**: Bull (+3%), Sideways, Bear (-3%)
- **4 optimization modes**: Expected Value, Win Rate, Sharpe, Min Drawdown

### Step 4: Daily Recommendations
Generates actionable recommendations by:
1. Reading today's VIX and market regime
2. Fetching regime-specific optimal band (with fallback chain)
3. Computing exact strike prices from current spot

---

## 🔧 Configuration Reference

### Key `.env` Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | *(must set)* | PostgreSQL password |
| `APP_SECRET_KEY` | *(must set)* | JWT signing key (64-char hex) |
| `LLM_PROVIDER` | `ollama` | `ollama` or `openai` |
| `OPENAI_API_KEY` | `None` | OpenAI key (if provider=openai) |
| `INGESTION_CRON` | `0 18 * * 1-5` | Weekdays at 6 PM |
| `NSE_RATE_LIMIT` | `3` | Requests/sec to NSE |
| `VIX_LOW_THRESHOLD` | `15.0` | Below = Low VIX regime |
| `VIX_HIGH_THRESHOLD` | `25.0` | Above = High VIX regime |
| `TELEGRAM_BOT_TOKEN` | `None` | Telegram bot for alerts |
| `BACKFILL_DAYS` | `365` | Days of historical data on first run |

---

## 🧪 Running Tests

```bash
cd backend
pip install -e ".[dev]"
pytest tests/ -v
```

---

## 📁 Project Structure

```
NSE Analysis/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/            # REST API endpoints
│   │   ├── analytics/         # P&L, optimization, regimes
│   │   ├── chatbot/           # RAG engine, SQL agent, LLM
│   │   ├── ingestion/         # NSE scraper, collectors
│   │   ├── ml/                # Feature engineering
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── notifications/     # Telegram, email alerts
│   │   ├── scheduler/         # Celery tasks
│   │   └── config.py          # Pydantic settings
│   ├── alembic/               # DB migrations
│   └── tests/                 # Pytest test suite
├── frontend/                   # Next.js 15 React app
│   └── src/
│       ├── app/               # Pages (App Router)
│       │   ├── dashboard/     # All dashboard views
│       │   ├── chat/          # AI chatbot UI
│       │   ├── alerts/        # Notifications
│       │   └── settings/      # Configuration UI
│       ├── components/        # Shared components
│       └── lib/               # API client, utilities
├── nginx/                      # Reverse proxy config
├── scripts/                    # DB init SQL
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment template
├── start.ps1                   # Windows startup
└── start.sh                    # Linux/macOS startup
```

---

## 📖 API Reference

Full interactive documentation: **http://localhost:8000/api/docs**

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dashboard/overview` | Summary metrics |
| GET | `/api/v1/dashboard/weekly-index` | Weekly index recs |
| GET | `/api/v1/dashboard/monthly-index` | Monthly index recs |
| GET | `/api/v1/dashboard/stocks` | Stock recs ranked |
| GET | `/api/v1/recommendations/today` | All today's recs |
| GET | `/api/v1/analytics/heatmap/{symbol}` | CE/PE heatmap data |
| GET | `/api/v1/analytics/history/{symbol}` | Historical P&L |
| GET | `/api/v1/analytics/regimes/{symbol}` | Regime analysis |
| GET | `/api/v1/scanner/opportunities` | Top opportunities |
| POST | `/api/v1/chat/message` | Ask AI a question |
| POST | `/api/v1/auth/login` | JWT authentication |

---

## ⚠️ Disclaimer

This platform is for **educational and research purposes only**. Option selling carries significant risk of unlimited loss. Past performance of any strategy does not guarantee future results. Always consult a SEBI-registered investment advisor before trading.

---

## 📜 License

MIT License — see [LICENSE](LICENSE)
