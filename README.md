# 🎮 AlgoArena - AI Trading Arena

**A real-time stock market simulation game where you compete against AI-powered trading agents**

![nwHacks 2026](https://img.shields.io/badge/nwHacks-2026-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## 🚀 What Is This?

AlgoArena is an AI-powered stock market simulation game where AI agents from major institutions trade in real-time. Experience the **Indian Market** (NIFTY 50, Bank NIFTY) like never before with a bento-style dashboard, sparkles, and a vibe-checked Gen Z interface.

### ✨ Key Features

- **📈 Indian Market Simulation** - Real-time NIFTY 50, SENSEX, and Bank NIFTY action with realistic price action.
- **🤖 LLM-Powered Trading Agents** - AI agents powered by Google Gemini making moves based on technicals and news.
- **🍱 Bento Grid Dashboard** - A modern, sleek interface with glassy components and dynamic spacing.
- **✨ Sparkles & Micro-Animations** - Visual celebrations for big wins and smooth transitions for that premium feel.
- **🎮 Create Your Own Agent** - "Start Cooking" by writing your own strategy in natural language.
- **💬 AI Trading Consultant** - A Gen Z sentient sidekick for strategy and market vibes.
- **🏆 Live Leaderboard** - See who's securing the bread in real-time.

---

## 🆕 What's New?

### Core Simulation Features
- **Indian Market Focus** - Switch between NIFTY 50, Bank NIFTY, SENSEX, and more.
- **Bento Grid Layout** - Perfectly organized UI components for maximum focus and drip.
- **Gen Z Tone Polish** - Interface copy updated with terms like "No Cap", "Securing the bread", and "Start Cooking".
- **Multi-Agent Market** - 10+ agents including Quants (Citadel, Jane Street) and Fundamentalists.

### Real-Time WebSocket Streaming
- Live market index updates
- Agent trading activity feed
- Top gainers/losers tracking
- Portfolio P&L calculations

### Smart News System
- Quant traders see news immediately
- Fundamental traders see news 1 tick later
- Retail traders see news 2 ticks later (simulating social media delay)

### Gemini-Powered Chat Assistant
- Ask about market conditions
- Chat assistant gives in-game commentary and strategy suggestions for the simulation
- AI knows live market data

---

## 🛠️ Tech Stack

### Backend (Python)
| Technology | Purpose |
|------------|---------|
| **FastAPI** | High-performance async web framework |
| **WebSockets** | Real-time bidirectional communication |
| **OpenRouter API** | LLM access for trading agents (Gemini 2.0 Flash) |
| **Google GenAI** | Gemini API for chat assistant |
| **Uvicorn** | ASGI server |

### Frontend (TypeScript/React)
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **TypeScript** | Type safety |
| **TailwindCSS** | Utility-first styling |
| **Shadcn/UI** | Component library (Radix primitives) |
| **Recharts** | Data visualization |
| **Framer Motion** | Animations |
| **React Query** | Data fetching |

### Architecture
| Component | Description |
|-----------|-------------|
| **SimulationOrchestrator** | Central controller for tick-based market simulation |
| **OrderBook** | Price-time priority order matching engine |
| **TradingAgent** | LLM-powered agent with tool-calling capabilities |
| **NewsGenerator** | Random market news events |

---

## 🏃 How to Run

### Prerequisites for Option 1: Local Development
- Python 3.11+
- Node.js 18+
- OpenRouter API key (for trading agents)
- Google GenAI API key (for chat)

---

### 🖥️ Option 1: Local Development

For **local testing only** — no Nginx needed.

```bash
# Terminal 1: Backend
python server.py

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

### 🌐 Option 2: Use Live Server

A live server is already running 24/7 on Oracle Cloud:

| Service | URL |
|---------|-----|
| **Web App** | http://163.192.25.163/ |
| **API** | http://163.192.25.163/api/... |
| **WebSocket** | ws://163.192.25.163/ws |

Just open the URL in your browser — no setup required!

> **Server Info:** The server uses Nginx as a reverse proxy and runs the backend via tmux for continuous operation.

---

## 📊 How the Simulation Works

> **Project Demo** Check out our project (demo video included) on [Devpost](https://devpost.com/software/algoarena)!

1. **Market Opens** - 500 S&P stocks loaded with 12-month price history
2. **Each Tick (Day)**:
   - Random market volatility applied (some stocks are bullish, some bearish)
   - News events may trigger (10% chance per tick)
   - Market maker posts quotes
   - LLM agents analyze market and make trading decisions
   - Orders matched in order book
   - Portfolios updated, P&L calculated
3. **Simulation Ends** - Final leaderboard shows who won!

---

## 🎯 Create Your Own Trading Agent

Write your strategy in natural language:

```python
MY_STRATEGY = """
I am a SMART CONTRARIAN. I look for overreactions in the market.
- When a stock drops MORE than 5% below its historical average, I BUY (oversold)
- When a stock rises MORE than 5% above its historical average, I SELL (overbought)
- I use medium position sizes (10-20 shares)
- I'm patient and wait for clear opportunities
"""
```

Or use pre-built strategies: `contrarian`, `momentum`, `value_hunter`, `sector_rotator`, `yolo`

---

## 📁 Project Structure

```
nwhacks2026/
├── server.py           # FastAPI WebSocket server (Indian Market Focus)
├── orchestration.py    # Simulation orchestrator
├── order_book.py       # Order matching engine
├── agents.py           # LLM trading agents
├── custom_agent.py     # Custom agent factory
├── news_events.py      # News event generator
├── stocks_nifty50.csv  # NIFTY 50 stock data (Indian Index)
├── stocks_sensex.csv   # SENSEX stock data
├── stocks_banknifty.csv # Bank NIFTY stock data
├── requirements.txt    # Python dependencies
├── frontend/           # React 18 + Vite + Tailwind + Shadcn
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── WEBSOCKET_API_FORMAT.md
```

---

## 👥 Team

Teammate: Dane, Timothy, Yaolong

Built with ❤️ at **nwHacks 2026**

---

## 📜 License

MIT License - Feel free to fork and build upon this project!
