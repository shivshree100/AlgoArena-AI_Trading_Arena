# 🎯 AlgoArena – AI Trading Arena

**A Real-Time AI-Powered Market Simulation & Strategy Research Platform**

![Python](https://img.shields.io/badge/Python-3.11+-green)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## 🚀 Overview

**AlgoArena** is an AI-driven stock market simulation platform that models real-time trading behavior across Indian financial markets such as **NIFTY 50, SENSEX, Bank NIFTY, and FINNIFTY**.

The platform combines:

* Multi-agent AI trading simulation
* LLM-powered decision-making agents
* Deterministic strategy backtesting engine
* Real-time WebSocket streaming
* Modern interactive trading dashboard

It was built to explore how different trading philosophies (momentum, contrarian, value-based, etc.) perform in dynamic market conditions.

---

## 🎯 Core Objectives

* Simulate institutional and retail trading behavior in Indian markets
* Compare LLM-based AI agents against deterministic strategy models
* Provide a quantitative research layer via backtesting
* Create an interactive and intuitive market visualization experience
* Analyze performance metrics such as alpha, Sharpe ratio, drawdown, and volatility

---

## ✨ Key Features

### 📈 Indian Market Simulation

* Supports NIFTY 50, SENSEX, Bank NIFTY, FINNIFTY
* Tick-based market progression
* Volatility modeling and trend simulation
* Dynamic price updates per trading cycle

### 🤖 LLM-Powered Trading Agents

* Agents powered via OpenRouter (Gemini Flash models)
* Institutional archetypes:

  * Quant Momentum Traders
  * Fundamental Value Investors
  * Retail Emotional Traders
* Agents react to:

  * Market trends
  * Historical price data
  * News events
  * Portfolio positions

### 📰 Smart News Engine

* Randomized market events (earnings, macro, sector shocks)
* Information latency simulation:

  * Quants → immediate access
  * Fundamental investors → delayed
  * Retail → social-delay simulation

### 📊 Strategy Backtesting Engine (Deterministic Mode)

* Historical price replay (no LLM randomness)
* Strategy evaluation with:

  * Total Return
  * Annualized Return
  * Sharpe Ratio
  * Volatility
  * Max Drawdown
  * Win Rate
* Equity curve visualization
* Trade history tracking

### 💬 AI Trading Consultant

* Gemini-powered interactive assistant
* Provides strategy guidance and market commentary
* Context-aware responses using live simulation state

### 🏆 Live Leaderboard

* Real-time P&L tracking
* Portfolio value updates
* Performance comparison across agents

---

## 🧠 Backtesting Engine (Research Layer)

The backtesting module converts AlgoArena into a **quantitative research tool**.

### How It Works

* Historical stock data is replayed tick-by-tick
* Selected strategy logic is applied deterministically
* Fixed capital allocation: ₹100,000 equivalent simulation
* Fixed position sizing (10 shares per trade)
* Portfolio value recalculated every tick

### Supported Strategies

* `contrarian`
* `momentum`
* `value_hunter`
* `sector_rotator`
* `yolo`

### Output

* Equity curve (for charting)
* Trade log
* Performance metrics dashboard

This ensures real performance analysis rather than randomness-based outcomes.

---

## 🛠️ Tech Stack

### Backend

* **FastAPI** – Async web framework
* **WebSockets** – Real-time streaming
* **OpenRouter API** – LLM trading agents
* **Google GenAI** – AI chat assistant
* **Uvicorn** – ASGI server

### Frontend

* **React 18**
* **TypeScript**
* **Vite**
* **TailwindCSS**
* **Shadcn/UI**
* **Recharts**
* **Framer Motion**
* **React Query**

---

## 🏗️ System Architecture

| Component              | Role                                       |
| ---------------------- | ------------------------------------------ |
| SimulationOrchestrator | Controls tick-based market simulation      |
| OrderBook              | Price-time priority order matching         |
| TradingAgent           | LLM-based agent decision engine            |
| NewsGenerator          | Market event simulation                    |
| Backtesting Engine     | Deterministic historical evaluation module |

---

## 🏃 How To Run

### 🔹 Local Development

#### Backend

```bash
pip install -r requirements.txt
python server.py
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit:

```
http://localhost:5173
```

---

### 🔹 Live Deployment

Hosted on Oracle Cloud:

| Service   | URL                                                         |
| --------- | ----------------------------------------------------------- |
| Web App   | [http://163.192.25.163/](http://163.192.25.163/)            |
| API       | [http://163.192.25.163/api/](http://163.192.25.163/api/)... |
| WebSocket | ws://163.192.25.163/ws                                      |

---

## 📂 Project Structure

```
server.py              # FastAPI server
orchestration.py       # Simulation controller
order_book.py          # Matching engine
agents.py              # LLM trading agents
backtesting.py         # Deterministic backtesting engine
news_events.py         # News generator
stocks_*.csv           # Indian index datasets
frontend/              # React application
```

---

## 📊 What Makes AlgoArena Unique?

* Combines AI agents + deterministic research layer
* Models real-world information latency
* Designed for both simulation AND strategy evaluation
* Clean architecture separating live simulation from research mode
* Production-style frontend with real-time updates

---

## 👥 Team

Built by:

* **Rachit**
* **Ishaan**
* **Tanvi**
* **Shivshree**

Developed at **Live Ai IVY Plus 2026**

