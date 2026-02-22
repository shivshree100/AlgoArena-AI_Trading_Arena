"""
WebSocket API Server - Streams market simulation data in real-time.
"""

import asyncio
import json
from typing import Set, Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from orchestration import SimulationOrchestrator, Side
from order_book import create_order_books
from agents import create_agent, DumbRetailHolder, DumbRetailDaytrader
from news_events import NewsGenerator
from market_data import fetch_market_data, MarketDataProvider, MARKET_TICKERS

# Try to import custom agent, but don't fail if it has issues
try:
    from custom_agent import create_custom_agent
    CUSTOM_AGENT_AVAILABLE = True
except:
    CUSTOM_AGENT_AVAILABLE = False


app = FastAPI(title="SmartAlgo API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connected WebSocket clients
connected_clients: Set[WebSocket] = set()

# Global market state for chat context
current_market_state = {
    "market_index": 100.0,
    "top_gainers": [],
    "top_losers": [],
    "tick": 0,
    "is_running": False,
}


def load_stocks(csv_path="stocks_nifty.csv"):
    """Load stocks from CSV file (NIFTY 50 + Bank NIFTY data with 12 monthly prices)."""
    import csv
    from pathlib import Path
    
    # Get path relative to this file
    csv_full_path = Path(__file__).parent / csv_path
    
    stocks = []
    with open(csv_full_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Build history from 12 monthly prices (oldest to newest)
            history = []
            for i in range(12, 0, -1):
                price_key = f"price_{i}"
                if price_key in row:
                    history.append(float(row[price_key]))
            
            stocks.append({
                "ticker": row["ticker"],
                "name": row["name"],
                "sector": row["sector"],
                "history": history,  # 12 monthly prices
                "current_price": float(row["current_price"])
            })
    return stocks


def load_stocks_from_yfinance(
    market: str = 'us_tech',
    custom_tickers: Optional[List[str]] = None,
    period: str = '3mo',
    interval: str = '1d'
):
    """
    Load stocks from yfinance API with real historical data.
    
    Args:
        market: Predefined market ('us_tech', 'us_sp500_sample', 'india_nifty50', 'crypto')
        custom_tickers: Optional list of custom ticker symbols
        period: Historical period (1mo, 3mo, 6mo, 1y, 2y, etc.)
        interval: Data interval (1d, 1wk, 1mo)
    
    Returns:
        List of stock dicts with format: {ticker, name, sector, history, current_price}
    """
    print(f"\n📡 Fetching live data from yfinance...")
    print(f"   Market: {market}")
    print(f"   Period: {period}, Interval: {interval}")
    
    stocks = fetch_market_data(
        market=market,
        custom_tickers=custom_tickers,
        period=period,
        interval=interval,
        include_info=True
    )
    
    if not stocks:
        print("   ⚠️ No data fetched, falling back to CSV data")
        return load_stocks()
    
    print(f"   ✅ Successfully loaded {len(stocks)} stocks from yfinance")
    return stocks


def calculate_market_index(initial_prices: dict, current_prices: dict) -> float:
    """
    Calculate price-weighted market index (like Dow Jones).
    Returns index value starting at 100.
    """
    # Divisor is set so index starts at 100
    start_total = sum(initial_prices.values())
    current_total = sum(current_prices.values())
    
    if start_total == 0:
        return 100.0
    
    return 100.0 * (current_total / start_total)


async def broadcast(message: dict):
    """Send message to all connected clients."""
    if not connected_clients:
        return
    
    message_json = json.dumps(message)
    disconnected = set()
    
    for client in connected_clients:
        try:
            await client.send_text(message_json)
        except:
            disconnected.add(client)
    
    # Remove disconnected clients
    for client in disconnected:
        connected_clients.discard(client)


async def run_simulation_streaming(
    num_ticks: int = 5, 
    tick_delay: float = 1.0,
    custom_agent_config: dict = None,
    market_type: str = "nifty50",
    data_source: str = "csv",
    yf_market: str = "us_tech",
    yf_tickers: Optional[List[str]] = None,
    yf_period: str = "3mo",
    yf_interval: str = "1d"
):
    """Run simulation and stream each tick to connected clients.
    
    Args:
        num_ticks: Number of simulation ticks
        tick_delay: Delay between ticks in seconds
        custom_agent_config: Optional config for custom agent:
            - name: Display name for the agent
            - prompt: Custom system prompt for trading strategy
            - capital: Starting capital (default: 100000)
        market_type: Market index CSV to use (for csv data source)
        data_source: Data source - "csv" for simulated data or "yfinance" for live data
        yf_market: yfinance market type (us_tech, india_nifty50, etc.)
        yf_tickers: Custom ticker list for yfinance
        yf_period: Historical period for yfinance (1mo, 3mo, 6mo, 1y, etc.)
        yf_interval: Data interval for yfinance (1d, 1wk, 1mo)
    """
    global current_market_state
    
    # Load stocks based on data source
    # Determine currency symbol based on market
    def get_currency_for_market(ds, yf_mkt, mkt_type):
        if ds == "yfinance":
            if yf_mkt in ('india_nifty50',):
                return '₹'
            elif yf_mkt in ('crypto',):
                return '$'  # crypto is USD-denominated
            else:
                return '$'  # US markets
        else:
            return '₹'  # CSV data is Indian markets
    
    currency = get_currency_for_market(data_source, yf_market, market_type)
    
    # yfinance market label mapping
    yf_market_labels = {
        'us_tech': 'US Tech',
        'us_sp500_sample': 'S&P 500',
        'india_nifty50': 'NIFTY 50',
        'crypto': 'Crypto',
    }
    
    if data_source == "yfinance":
        print(f"\n🌐 Using LIVE DATA from yfinance")
        stock_data = load_stocks_from_yfinance(
            market=yf_market,
            custom_tickers=yf_tickers,
            period=yf_period,
            interval=yf_interval
        )
        market_label = yf_market_labels.get(yf_market, yf_market.upper()) if not yf_tickers else "Custom Tickers"
    else:
        # Load stocks based on market type from CSV
        market_config = {
            "nifty50": {"file": "stocks_nifty50.csv", "label": "NIFTY 50"},
            "banknifty": {"file": "stocks_banknifty.csv", "label": "Bank NIFTY"},
            "sensex": {"file": "stocks_sensex.csv", "label": "SENSEX"},
            "finnifty": {"file": "stocks_finnifty.csv", "label": "Fin NIFTY"},
            "bankex": {"file": "stocks_bankex.csv", "label": "BANKEX"}
        }
        
        config = market_config.get(market_type, market_config["nifty50"])
        csv_file = config["file"]
        market_label = config["label"]
        
        print(f"\n📊 Using SIMULATED DATA from CSV")
        stock_data = load_stocks(csv_file)
    
    tickers = [s["ticker"] for s in stock_data]
    initial_prices = {s["ticker"]: s["current_price"] for s in stock_data}
    stock_history = {s["ticker"]: s["history"] for s in stock_data}
    stock_names = {s["ticker"]: s["name"] for s in stock_data}
    print(f"\n🏛️ Market: {market_label} ({len(tickers)} stocks)")
    
    # Determine date range for the data and broadcast market info
    data_from = None
    data_to = None
    if data_source == "yfinance" and tickers:
        try:
            import yfinance as yf
            sample = yf.Ticker(tickers[0])
            sample_data = sample.history(period=yf_period, interval=yf_interval)
            if not sample_data.empty:
                data_from = sample_data.index[0].strftime("%b %d, %Y")
                data_to = sample_data.index[-1].strftime("%b %d, %Y")
                print(f"   Period: {yf_period}, Interval: {yf_interval}")
                print(f"   📅 Data range: {data_from} → {data_to}")
        except Exception as e:
            print(f"   ⚠️ Could not determine date range: {e}")
    
    # Broadcast market info to all clients (label, currency, date range)
    await broadcast({
        "type": "market_info",
        "market_label": market_label,
        "currency": currency,
        "data_source": data_source,
        "data_from": data_from,
        "data_to": data_to,
    })
    
    # Setup orchestrator
    orchestrator = SimulationOrchestrator()
    # Restored realistic volatility for technical analysis opportunities
    order_books = create_order_books(tickers, initial_prices, price_impact=0.0005, volatility=0.02)
    
    # Log which stocks are winners/losers
    print("\n📊 Stock Trends for this simulation:")
    bulls = [t for t, b in order_books.items() if b._trend_bias > 0.005]
    bears = [t for t, b in order_books.items() if b._trend_bias < -0.005]
    neutral = [t for t, b in order_books.items() if -0.005 <= b._trend_bias <= 0.005]
    print(f"  📈 BULLISH ({len(bulls)}): {', '.join(bulls[:8])}{'...' if len(bulls) > 8 else ''}")
    print(f"  📉 BEARISH ({len(bears)}): {', '.join(bears[:8])}{'...' if len(bears) > 8 else ''}")
    print(f"  ➡️  NEUTRAL ({len(neutral)}): {', '.join(neutral[:5])}{'...' if len(neutral) > 5 else ''}")
    
    for ticker, book in order_books.items():
        orchestrator.register_stock(ticker, book)
    
    # Register agents
    orchestrator.register_agent("citadel", initial_cash=1000000.0)
    orchestrator.register_agent("jane_street", initial_cash=1000000.0)
    orchestrator.register_agent("blackrock", initial_cash=2000000.0)
    orchestrator.register_agent("vanguard", initial_cash=2000000.0)
    orchestrator.register_agent("retail_1", initial_cash=50000.0)
    orchestrator.register_agent("retail_2", initial_cash=50000.0)
    orchestrator.register_agent("retail_3", initial_cash=50000.0)
    orchestrator.register_agent("retail_4", initial_cash=50000.0)
    orchestrator.register_agent("retail_daytrader", initial_cash=50000.0)
    
    # Custom agent - use capital from config if provided, default to $100k
    custom_capital = 100000.0
    if custom_agent_config and custom_agent_config.get("capital"):
        custom_capital = float(custom_agent_config["capital"])
    orchestrator.register_agent("my_agent", initial_cash=custom_capital)
    print(f"   💰 Custom agent capital: ${custom_capital:,.0f}")
    
    orchestrator.register_agent("market_maker", initial_cash=10000000.0)
    
    # Categorize stocks by trend
    bullish_stocks = [t for t, b in order_books.items() if b._trend_bias > 0.003]
    bearish_stocks = [t for t, b in order_books.items() if b._trend_bias < -0.003]
    neutral_stocks = [t for t, b in order_books.items() if -0.003 <= b._trend_bias <= 0.003]
    
    # Give starting shares - institutions get ALL stocks
    for ticker in tickers:
        orchestrator._agent_portfolios["citadel"].positions[ticker] = 200
        orchestrator._agent_portfolios["jane_street"].positions[ticker] = 200
        orchestrator._agent_portfolios["blackrock"].positions[ticker] = 100
        orchestrator._agent_portfolios["vanguard"].positions[ticker] = 100
        orchestrator._agent_portfolios["market_maker"].positions[ticker] = 2000
    
    # Retail 1 & 2: Get BEARISH stocks (bad luck, will lose)
    for ticker in bearish_stocks[:15]:  # Up to 15 bearish stocks
        orchestrator._agent_portfolios["retail_1"].positions[ticker] = 15
        orchestrator._agent_portfolios["retail_2"].positions[ticker] = 15
    
    # Retail 3 & 4: Get BULLISH stocks (lucky, will win)
    for ticker in bullish_stocks[:15]:  # Up to 15 bullish stocks
        orchestrator._agent_portfolios["retail_3"].positions[ticker] = 15
        orchestrator._agent_portfolios["retail_4"].positions[ticker] = 15
    
    # Daytrader: Mixed bag (random outcome)
    import random
    mixed_stocks = random.sample(tickers, min(20, len(tickers)))
    for ticker in mixed_stocks:
        orchestrator._agent_portfolios["retail_daytrader"].positions[ticker] = 10
    
    # Custom agent: Gets BULLISH stocks (same advantage as winning retail traders)
    # This gives your bot a fighting chance to profit
    for ticker in bullish_stocks[:12]:  # Top 12 bullish stocks
        orchestrator._agent_portfolios["my_agent"].positions[ticker] = 20
    
    print(f"\n👥 Retail Stock Assignments:")
    print(f"  📉 Retail 1 & 2: {len(bearish_stocks[:15])} bearish stocks (will likely LOSE)")
    print(f"  📈 Retail 3 & 4: {len(bullish_stocks[:15])} bullish stocks (will likely WIN)")
    print(f"  🎲 Daytrader: {len(mixed_stocks)} mixed stocks (random)")
    print(f"  🎮 Your Agent: {len(bullish_stocks[:12])} BULLISH stocks (optimized for profit)")
    
    # Create agents
    MODEL = "gemini-2.0-flash"
    
    citadel = create_agent("citadel", orchestrator, "quant_institutional", MODEL, stock_history)
    jane_street = create_agent("jane_street", orchestrator, "quant_institutional", MODEL, stock_history)
    blackrock = create_agent("blackrock", orchestrator, "fundamental_institutional", MODEL, stock_history)
    vanguard = create_agent("vanguard", orchestrator, "fundamental_institutional", MODEL, stock_history)
    
    retail_1 = DumbRetailHolder("retail_1", orchestrator, stock_history)
    retail_2 = DumbRetailHolder("retail_2", orchestrator, stock_history)
    retail_3 = DumbRetailHolder("retail_3", orchestrator, stock_history)
    retail_4 = DumbRetailHolder("retail_4", orchestrator, stock_history)
    retail_daytrader = DumbRetailDaytrader("retail_daytrader", orchestrator, stock_history)
    
    # Custom agent - use config if provided, otherwise default strategy
    my_agent = None
    my_agent_name = "MY_AGENT"  # Default name
    
    if CUSTOM_AGENT_AVAILABLE:
        # Check if user provided a custom strategy (non-empty prompt)
        user_prompt = custom_agent_config.get("prompt", "").strip() if custom_agent_config else ""
        
        if user_prompt:
            # User provided custom strategy
            MY_STRATEGY = user_prompt
            my_agent_name = custom_agent_config.get("name", "MY_AGENT").upper()
            print(f"\n🎮 Creating custom agent: {my_agent_name}")
            print(f"   Strategy: {MY_STRATEGY[:100]}...")
        else:
            # OPTIMIZED: Ultra-Clear 3-Stock Momentum Strategy
            MY_STRATEGY = """
STRICT RULE: I hold EXACTLY 3 stocks. Never more, never less.

EVERY TICK:

1. get_history()

2. RANK ALL STOCKS by 3-tick momentum:
   - For each stock: momentum = (current / price_3_ticks_ago) - 1
   - Sort highest to lowest
   - Top 3 = my targets

3. get_portfolio()

4. SELL PHASE:
   - Count my positions
   - If I own MORE than 3 stocks → SELL EVERYTHING (reset)
   - If I own 3 or less:
     - For each stock I own:
       - If NOT in my top 3 targets → SELL ALL shares

5. BUY PHASE:
   - For each of my 3 targets:
     - If I don't own it → BUY 65 shares
     - If I own less than 65 shares → BUY more to reach 65

6. done()

RULES:
- Maximum 3 stocks EVER
- 65 shares per stock
- Rotate into top 3 momentum every tick
- Deploy 85%+ capital
- Cut losers instantly

GOAL: Hold top 3 momentum stocks with 65 shares each. Maximize capital deployment.
"""
        my_agent = create_custom_agent("my_agent", orchestrator, MY_STRATEGY, MODEL, stock_history)
    
    all_agents = ["citadel", "jane_street", "blackrock", "vanguard", 
                  "retail_1", "retail_2", "retail_3", "retail_4", "retail_daytrader", "my_agent"]
    
    # Calculate starting values
    start_values = {}
    for agent_id in all_agents:
        p = orchestrator.get_agent_portfolio(agent_id)
        total = p.cash + sum(p.positions.get(t, 0) * initial_prices[t] for t in tickers)
        start_values[agent_id] = total
    
    # Send simulation start
    await broadcast({"price": 100.0})
    
    # Initialize news generator
    news_generator = NewsGenerator(tickers, news_probability=0.10)  # 10% chance per tick (less frequent)
    
    SPREAD_PCT = 0.002
    MM_SIZE = 100
    
    # Run simulation
    for tick in range(num_ticks):
        print("\n" + "=" * 80)
        print(f"TICK {tick}")
        print("=" * 80)
        
        # Apply random price fluctuations to ALL stocks at start of tick
        # This simulates natural market movement (other traders, sentiment, macro events)
        
        # RESTORED: One bear market crash on tick 2 (Day 3) for realistic stress testing
        is_crash_tick = (tick == 2)
        
        if is_crash_tick:
            print("\n🐻 BEAR MARKET DAY! 📉")
            await broadcast({
                "type": "news",
                "headline": "🐻 Markets tumble on recession fears",
                "stock": "ALL",
                "sentiment": "negative",
                "tick": tick
            })
            await asyncio.sleep(0.3)
        else:
            print("\n📊 Market Movement:")
        
        big_movers = []
        for ticker in tickers:
            if is_crash_tick:
                # Bear day - 5-10% down (reduced from 8-15% for better survivability)
                import random
                crash_pct = random.uniform(-0.10, -0.05)
                order_books[ticker]._last_price *= (1 + crash_pct)
                pct_change = crash_pct * 100
            else:
                # Normal volatility - Increased for more trading opportunities
                pct_change = order_books[ticker].apply_tick_volatility(base_volatility=0.04)
            
            if abs(pct_change) > 1.0:  # Only log big moves (>1%)
                direction = "📈" if pct_change > 0 else "📉"
                big_movers.append(f"  {direction} {ticker}: {pct_change:+.1f}%")
        
        if big_movers:
            for mover in big_movers[:5]:  # Show top 5 big movers
                print(mover)
        else:
            print("  (quiet market)")
        
        # Market Maker posts quotes first
        for ticker in tickers:
            last_price = order_books[ticker].get_last_price()
            spread = last_price * SPREAD_PCT
            orchestrator.submit_order("market_maker", ticker, Side.BUY, round(last_price - spread/2, 2), MM_SIZE)
            orchestrator.submit_order("market_maker", ticker, Side.SELL, round(last_price + spread/2, 2), MM_SIZE)
        
        # Generate news event RIGHT BEFORE agents start (guaranteed on tick 0, 40% chance after)
        if tick == 0:
            # Force news on first tick for dramatic opening
            old_prob = news_generator.news_probability
            news_generator.news_probability = 1.0
            news_event = news_generator.maybe_generate_news(tick)
            news_generator.news_probability = old_prob
            print(f"   🎯 Tick 0 forced news: {news_event}")
        else:
            news_event = news_generator.maybe_generate_news(tick)
            print(f"   🎲 Random news check: {news_event is not None}")
        
        if news_event:
            print(f"\n📰 NEWS: {news_event.headline}")
            print(f"   Stock: {news_event.stock}, Sentiment: {'📈' if news_event.sentiment > 0 else '📉'}")
            
            # Broadcast news to frontend IMMEDIATELY
            news_payload = {
                "type": "news",
                "headline": news_event.headline,
                "stock": news_event.stock,
                "sentiment": "positive" if news_event.sentiment > 0 else "negative",
                "tick": tick
            }
            print(f"   📡 Broadcasting news: {news_payload}")
            await broadcast(news_payload)
            await asyncio.sleep(0.5)  # Longer pause so news REALLY stands out
            
            # Apply immediate price impact from news
            impact = news_event.sentiment * news_event.magnitude * 0.03  # Up to 3% move
            old_price = order_books[news_event.stock].get_last_price()
            order_books[news_event.stock]._last_price *= (1 + impact)
            new_price = order_books[news_event.stock].get_last_price()
            print(f"   Price impact: ${old_price:.2f} → ${new_price:.2f} ({impact*100:+.1f}%)")
        
        # Prepare news dict for agents (if news happened this tick)
        current_news = None
        if news_event:
            current_news = {
                "headline": news_event.headline,
                "stock": news_event.stock,
                "sentiment": "positive" if news_event.sentiment > 0 else "negative",
            }
        
        # LLM agents decide (institutional) - STREAM EVENTS IMMEDIATELY
        # Quants see news IMMEDIATELY, fundamentals see it 1 tick later
        llm_agents = [
            (citadel, "CITADEL", "🏦", "quant"), (jane_street, "JANE STREET", "🏦", "quant"),
            (blackrock, "BLACKROCK", "📊", "fundamental"), (vanguard, "VANGUARD", "📊", "fundamental")
        ]
        for agent, name, emoji, agent_type in llm_agents:
            print(f"\n[{emoji} {name} thinking...]")
            try:
                # Quants see news immediately, fundamentals don't (they analyze first)
                news_for_agent = current_news if agent_type == "quant" else None
                if news_for_agent:
                    print(f"  📰 {name} sees breaking news about {news_for_agent['stock']}!")
                
                actions = agent.decide(tick, news=news_for_agent)
                trades = [a for a in actions if a.get("tool", {}).get("tool") in ["buy", "sell"]]
                if trades:
                    for action in trades:
                        tool = action["tool"].get("tool")
                        args = action["tool"].get("args", {})
                        ticker_sym = args.get('ticker', '?')
                        size = args.get('size', 0)
                        action_text = "BUYS" if tool == "buy" else "SELLS"
                        event = f"{emoji} {name} {action_text} {size} {ticker_sym}"
                        print(f"  {event}")
                        await broadcast({"event": event})
                        await asyncio.sleep(0.1)  # Small delay between events
                else:
                    print("  (no trades)")
            except Exception as e:
                print(f"  Error: {e}")
        
        # Dumb retail agents decide - STREAM EVENTS WITH DELAY
        retail_agents = [
            (retail_1, "RETAIL_1", "👤"), (retail_2, "RETAIL_2", "👤"),
            (retail_3, "RETAIL_3", "👤"), (retail_4, "RETAIL_4", "👤"),
            (retail_daytrader, "DAYTRADER", "🎰")
        ]
        for agent, name, emoji in retail_agents:
            print(f"\n[{emoji} {name} trading...]")
            actions = agent.decide(tick)
            if actions:
                for action in actions:
                    action_text = action.get('action', str(action))
                    # Extract trade events (not fees)
                    if "BUY" in action_text.upper() or "SELL" in action_text.upper():
                        event = f"{emoji} {name} {action_text}"
                        print(f"  {action_text}")
                        await broadcast({"event": event})
                        await asyncio.sleep(0.15)  # Delay to match console pace
                    else:
                        print(f"  {action_text}")
            else:
                print("  (holding)")
        
        # Custom agent decides - STREAM EVENTS WITH DELAY
        # Custom agent sees news (like retail, slight delay but still sees it)
        if my_agent:
            print(f"\n[🎮 {my_agent_name} thinking...]")
            try:
                # Custom agents see news (so users can see their agent react)
                if current_news:
                    print(f"  📰 {my_agent_name} sees breaking news about {current_news['stock']}!")
                actions = my_agent.decide(tick, news=current_news)
                trades = [a for a in actions if a.get("tool", {}).get("tool") in ["buy", "sell"]]
                if trades:
                    for action in trades:
                        tool = action["tool"].get("tool")
                        args = action["tool"].get("args", {})
                        ticker_sym = args.get('ticker', '?')
                        size = args.get('size', 0)
                        action_text = "BUYS" if tool == "buy" else "SELLS"
                        event = f"🎮 {my_agent_name} {action_text} {size} {ticker_sym}"
                        print(f"  {event}")
                        await broadcast({"event": event})
                        await asyncio.sleep(0.1)  # Small delay between events
                else:
                    print("  (no trades)")
            except Exception as e:
                print(f"  Error: {e}")
        
        # Execute tick
        tick_log = orchestrator.run_tick()
        
        # Get current prices
        current_prices = {ticker: order_books[ticker].get_last_price() for ticker in tickers}
        
        # Update stock_history with live prices so agents can see trends
        for ticker in tickers:
            if ticker in stock_history:
                stock_history[ticker].append(round(current_prices[ticker], 2))
            else:
                stock_history[ticker] = [round(current_prices[ticker], 2)]
        
        # Calculate market index (price-weighted, like Dow)
        market_index = calculate_market_index(initial_prices, current_prices)
        
        print(f"\n📈 Trades executed: {len(tick_log.trades)}")
        print(f"📊 Market Index: {market_index:.2f} ({market_index - 100:+.2f}%)")
        
        # Calculate portfolio values for all agents
        portfolio_values = {}
        for agent_id in all_agents:
            p = orchestrator.get_agent_portfolio(agent_id)
            if p:
                # Portfolio value = cash + market value of all positions
                stock_value = sum(p.positions.get(t, 0) * current_prices.get(t, 0) for t in tickers)
                total_value = p.cash + stock_value
                start_val = start_values.get(agent_id, total_value)
                pnl_pct = ((total_value - start_val) / start_val) * 100 if start_val > 0 else 0
                portfolio_values[agent_id] = {
                    "value": round(total_value, 2),
                    "pnl": round(total_value - start_val, 2),
                    "pnl_pct": round(pnl_pct, 2)
                }
        
        # Calculate top movers (gainers and losers)
        all_movers = []
        for ticker in tickers:
            curr_price = current_prices[ticker]
            init_price = initial_prices[ticker]
            pct_change = ((curr_price - init_price) / init_price) * 100
            all_movers.append({
                "ticker": ticker,
                "name": stock_names.get(ticker, ticker),
                "price": round(curr_price, 2),
                "change": round(pct_change, 2)
            })
        
        # Sort and get top 5 gainers and losers
        gainers = sorted([m for m in all_movers if m["change"] > 0], key=lambda x: -x["change"])[:5]
        losers = sorted([m for m in all_movers if m["change"] < 0], key=lambda x: x["change"])[:5]
        
        # Update global market state for chat context
        current_market_state = {
            "market_index": round(market_index, 2),
            "top_gainers": gainers[:5],
            "top_losers": losers[:5],
            "tick": tick + 1,  # 1-indexed for display
            "is_running": True,
        }
        
        # BROADCAST: Price, tick, portfolio values, and top movers
        await broadcast({
            "price": round(market_index, 2), 
            "tick": tick,
            "portfolios": portfolio_values,
            "top_gainers": gainers,
            "top_losers": losers
        })
        
        # Wait before next tick
        await asyncio.sleep(tick_delay)
    
    # Simulation complete - calculate final P&L for all agents
    print(f"\nFinal price: {market_index:.2f}")
    
    final_results = []
    agent_display_names = {
        "citadel": "Alpha Quant",
        "jane_street": "Quantum Edge",
        "blackrock": "Titan Capital",
        "vanguard": "Horizon Fund",
        "retail_1": "Retail Trader 1",
        "retail_2": "Retail Trader 2",
        "retail_3": "Retail Trader 3",
        "retail_4": "Retail Trader 4",
        "retail_daytrader": "Daytrader",
        "my_agent": my_agent_name,
    }
    agent_types = {
        "citadel": "quant", "jane_street": "quant",
        "blackrock": "institutional", "vanguard": "institutional",
        "retail_1": "retail", "retail_2": "retail",
        "retail_3": "retail", "retail_4": "retail",
        "retail_daytrader": "retail",
        "my_agent": "custom",
    }
    
    for agent_id in all_agents:
        p = orchestrator.get_agent_portfolio(agent_id)
        final_value = p.cash + sum(p.positions.get(t, 0) * current_prices[t] for t in tickers)
        start_value = start_values[agent_id]
        pnl = final_value - start_value
        pnl_pct = (pnl / start_value) * 100 if start_value > 0 else 0
        
        # Build positions list with value for this agent
        positions_list = []
        for t, qty in p.positions.items():
            if qty > 0:
                positions_list.append({
                    "ticker": t,
                    "name": stock_names.get(t, t),
                    "quantity": qty,
                    "value": round(qty * current_prices.get(t, 0), 2)
                })
        positions_list.sort(key=lambda x: x["value"], reverse=True)
        
        final_results.append({
            "id": agent_id,
            "name": agent_display_names.get(agent_id, agent_id),
            "type": agent_types.get(agent_id, "unknown"),
            "start_value": round(start_value, 2),
            "final_value": round(final_value, 2),
            "pnl": round(pnl, 2),
            "pnl_pct": round(pnl_pct, 2),
            "cash": round(p.cash, 2),
            "positions": positions_list[:10],  # Top 10 holdings
        })
    
    # Sort by P&L %
    final_results.sort(key=lambda x: x["pnl_pct"], reverse=True)
    
    # Add ranks
    for i, result in enumerate(final_results):
        result["rank"] = i + 1
    
    # Update global state - simulation ended
    current_market_state["is_running"] = False
    
    # Generate plain text analysis report from simulation data (no API call)
    analysis_report = ""
    try:
        # Find user agent
        user_result = next((r for r in final_results if r['id'] == 'my_agent'), None)
        winner = final_results[0] if final_results else None
        loser = final_results[-1] if final_results else None
        
        gainers_text = ", ".join(f"{g.get('name', g['ticker'])} (+{g['change']:.1f}%)" for g in gainers[:5]) if gainers else "None"
        losers_text = ", ".join(f"{l.get('name', l['ticker'])} ({l['change']:.1f}%)" for l in losers[:5]) if losers else "None"
        
        market_direction = "BULLISH 📈" if market_index > 100 else "BEARISH 📉" if market_index < 100 else "FLAT ➡️"
        
        report_lines = []
        report_lines.append("# Post-Market Analysis Report")
        report_lines.append("")
        report_lines.append("## Market Overview")
        report_lines.append(f"The market finished at {market_index:.2f} ({market_index - 100:+.2f}% from start), making this a {market_direction} session over {num_ticks} trading days.")
        report_lines.append("")
        report_lines.append(f"**Top Gainers:** {gainers_text}")
        report_lines.append(f"**Top Losers:** {losers_text}")
        report_lines.append("")
        
        report_lines.append("## Leaderboard Summary")
        profitable = sum(1 for r in final_results if r['pnl'] > 0)
        report_lines.append(f"{profitable} out of {len(final_results)} agents finished in profit.")
        report_lines.append("")
        
        if winner:
            report_lines.append(f"**Winner:** {winner['name']} finished #{winner['rank']} with {winner['pnl_pct']:+.2f}% return ({currency}{winner['pnl']:+,.2f} profit). Strategy type: {winner['type']}.")
        if loser:
            report_lines.append(f"**Last Place:** {loser['name']} finished #{loser['rank']} with {loser['pnl_pct']:+.2f}% return ({currency}{loser['pnl']:+,.2f}).")
        report_lines.append("")
        
        # Full rankings
        report_lines.append("## Full Rankings")
        for r in final_results:
            marker = " ⭐ (YOUR BOT)" if r['id'] == 'my_agent' else ""
            report_lines.append(f"#{r['rank']} **{r['name']}** — {r['pnl_pct']:+.2f}% ({currency}{r['pnl']:+,.2f}){marker}")
        report_lines.append("")
        
        if user_result:
            report_lines.append("## Your Bot's Performance")
            report_lines.append(f"**{user_result['name']}** finished **#{user_result['rank']}** out of {len(final_results)} agents.")
            report_lines.append(f"- Return: **{user_result['pnl_pct']:+.2f}%**")
            report_lines.append(f"- Profit/Loss: **{currency}{user_result['pnl']:+,.2f}**")
            report_lines.append(f"- Starting Value: {currency}{user_result['start_value']:,.2f}")
            report_lines.append(f"- Final Value: {currency}{user_result['final_value']:,.2f}")
            report_lines.append(f"- Cash Remaining: {currency}{user_result.get('cash', 0):,.2f}")
            
            positions = user_result.get('positions', [])
            if positions:
                report_lines.append(f"- Stocks Held: {len(positions)}")
                top_holdings = ", ".join(f"{p.get('name', p['ticker'])} (x{p['quantity']}, {currency}{p['value']:,.0f})" for p in positions[:5])
                report_lines.append(f"- Top Holdings: {top_holdings}")
            else:
                report_lines.append("- Stocks Held: 0 (all cash)")
            report_lines.append("")
            
            # What went right/wrong
            report_lines.append("## What Happened")
            if user_result['pnl'] > 0:
                report_lines.append(f"Your bot made a profit of {currency}{user_result['pnl']:+,.2f}! It outperformed {len(final_results) - user_result['rank']} other agents.")
                if user_result['rank'] <= 3:
                    report_lines.append("Excellent performance — your strategy was among the top performers!")
                else:
                    report_lines.append("Good result, but there's room for improvement in timing and position sizing.")
            else:
                report_lines.append(f"Your bot lost {currency}{abs(user_result['pnl']):,.2f}. Here's what likely went wrong:")
                if market_index < 100:
                    report_lines.append("- The overall market was bearish, making it hard for any strategy to profit.")
                    report_lines.append("- Consider adding a 'stay in cash when market is falling' rule to your prompt.")
                if len(positions) == 0:
                    report_lines.append("- Your bot sold all its holdings or didn't buy enough stocks.")
                    report_lines.append("- Try being more aggressive with position sizes in your prompt.")
                if user_result.get('cash', 0) > user_result['final_value'] * 0.7:
                    report_lines.append("- Too much cash was sitting idle and not invested.")
                    report_lines.append("- Tell your bot to invest more of its capital.")
                else:
                    report_lines.append("- The stocks your bot chose likely went down in value.")
                    report_lines.append("- Try using a momentum approach: buy stocks trending UP, sell stocks trending DOWN.")
            report_lines.append("")
            
            report_lines.append("## Tips to Improve")
            report_lines.append("- **Follow trends:** Buy stocks whose recent prices are going UP, not DOWN")
            report_lines.append("- **Cut losses fast:** If a stock starts dropping, sell it immediately")
            report_lines.append("- **Be specific:** Tell your bot exact % thresholds (e.g., 'buy if up 2%+ over last 3 days')")
            report_lines.append("- **Position size:** Tell your bot to use 20-50 shares per trade, not just 5-10")
        
        analysis_report = "\n".join(report_lines)
        print(f"\n📝 Generated text analysis report ({len(analysis_report)} chars)")
    except Exception as e:
        print(f"⚠️ Failed to generate analysis report: {e}")
        analysis_report = "Analysis report could not be generated."
    
    # Broadcast simulation complete with results
    await broadcast({
        "type": "simulation_complete",
        "market_index": round(market_index, 2),
        "leaderboard": final_results,
        "analysis_report": analysis_report,
    })
    
    print("\n=== SIMULATION COMPLETE ===")
    print("🏆 LEADERBOARD:")
    for r in final_results:
        print(f"  #{r['rank']} {r['name']}: {r['pnl_pct']:+.2f}% (${r['pnl']:+,.2f})")


# Store the simulation task
simulation_task = None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for streaming market data."""
    await websocket.accept()
    connected_clients.add(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}")
    
    try:
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to SmartAlgo API"
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=60.0)
                
                # Handle client commands
                if data.get("command") == "start_simulation":
                    global simulation_task
                    num_ticks = data.get("num_ticks", 5)
                    tick_delay = data.get("tick_delay", 1.0)
                    
                    # Extract custom agent config if provided
                    custom_agent_config = data.get("custom_agent")
                    # custom_agent format: {"name": "My Bot", "prompt": "I am a momentum trader..."}
                    
                    # Extract market type (for CSV data)
                    market_type = data.get("market_type", "nifty50")
                    
                    # Extract data source and yfinance parameters
                    data_source = data.get("data_source", "csv")  # "csv" or "yfinance"
                    yf_market = data.get("yf_market", "us_tech")
                    yf_tickers = data.get("yf_tickers")  # Optional custom tickers
                    yf_period = data.get("yf_period", "3mo")
                    yf_interval = data.get("yf_interval", "1d")
                    
                    if simulation_task is None or simulation_task.done():
                        simulation_task = asyncio.create_task(
                            run_simulation_streaming(
                                num_ticks, tick_delay, custom_agent_config, market_type,
                                data_source, yf_market, yf_tickers, yf_period, yf_interval
                            )
                        )
                        # Determine market label and currency for frontend
                        yf_labels = {'us_tech': 'US Tech', 'us_sp500_sample': 'S&P 500', 'india_nifty50': 'NIFTY 50', 'crypto': 'Crypto'}
                        csv_labels = {'nifty50': 'NIFTY 50', 'banknifty': 'Bank NIFTY', 'sensex': 'SENSEX', 'finnifty': 'Fin NIFTY', 'bankex': 'BANKEX'}
                        if data_source == 'yfinance':
                            sim_market_label = yf_labels.get(yf_market, yf_market.upper())
                            sim_currency = '₹' if yf_market == 'india_nifty50' else '$'
                        else:
                            sim_market_label = csv_labels.get(market_type, 'NIFTY 50')
                            sim_currency = '₹'
                        
                        # Determine date range for yfinance data
                        sim_data_from = None
                        sim_data_to = None
                        if data_source == 'yfinance':
                            try:
                                import yfinance as yf_check
                                # Quick fetch on first available ticker to get dates
                                yf_tickers_list = yf_tickers or []
                                if not yf_tickers_list:
                                    from market_data import MARKET_TICKERS
                                    yf_tickers_list = MARKET_TICKERS.get(yf_market, ['AAPL'])
                                sample = yf_check.Ticker(yf_tickers_list[0])
                                sample_hist = sample.history(period=yf_period, interval=yf_interval)
                                if not sample_hist.empty:
                                    sim_data_from = sample_hist.index[0].strftime('%b %d, %Y')
                                    sim_data_to = sample_hist.index[-1].strftime('%b %d, %Y')
                            except Exception as e:
                                print(f"⚠️ Could not determine date range: {e}")
                        
                        sim_starting_msg = {
                            "type": "simulation_starting",
                            "num_ticks": num_ticks,
                            "data_source": data_source,
                            "market": yf_market if data_source == "yfinance" else market_type,
                            "market_label": sim_market_label,
                            "currency": sim_currency,
                            "data_from": sim_data_from,
                            "data_to": sim_data_to,
                            "custom_agent": custom_agent_config.get("name") if custom_agent_config else None
                        }
                        print(f"📤 Sending simulation_starting: data_from={sim_data_from}, data_to={sim_data_to}")
                        await websocket.send_json(sim_starting_msg)
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Simulation already running"
                        })
                        
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
                
    except WebSocketDisconnect:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "SmartAlgo WebSocket API",
        "websocket_url": "/ws",
        "connected_clients": len(connected_clients)
    }


@app.post("/start")
async def start_simulation(num_ticks: int = 5, tick_delay: float = 1.0):
    """REST endpoint to start simulation (for testing)."""
    global simulation_task
    
    if simulation_task is not None and not simulation_task.done():
        return {"error": "Simulation already running"}
    
    simulation_task = asyncio.create_task(
        run_simulation_streaming(num_ticks, tick_delay)
    )
    
    return {"message": "Simulation started", "num_ticks": num_ticks}


# ============================================
# BACKTEST API ENDPOINT
# ============================================

from backtesting import run_backtest, STRATEGIES

class BacktestRequest(BaseModel):
    strategy: str
    market_type: str = "nifty50"
    tickers: Optional[List[str]] = None
    initial_capital: float = 100000.0

@app.post("/api/backtest")
async def run_backtest_endpoint(request: BacktestRequest):
    """Run a deterministic backtest for a given strategy. Non-blocking."""
    if request.strategy not in STRATEGIES:
        return {"error": f"Unknown strategy '{request.strategy}'. Choose from: {list(STRATEGIES.keys())}"}
    
    try:
        result = await asyncio.to_thread(
            run_backtest,
            request.strategy,
            request.market_type,
            request.tickers,
            request.initial_capital,
        )
        return result
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/backtest/strategies")
async def list_strategies():
    """Return available strategy names."""
    return {"strategies": list(STRATEGIES.keys())}


# ============================================
# LIVE DATA API ENDPOINTS
# ============================================

class LiveDataRequest(BaseModel):
    market: str = "us_tech"
    custom_tickers: Optional[List[str]] = None
    period: str = "3mo"
    interval: str = "1d"

@app.get("/api/markets/available")
async def get_available_markets():
    """Get list of available predefined markets for live data."""
    return {
        "markets": list(MARKET_TICKERS.keys()),
        "market_details": {
            "us_tech": {"name": "US Tech Giants", "count": len(MARKET_TICKERS["us_tech"])},
            "us_sp500_sample": {"name": "S&P 500 Sample", "count": len(MARKET_TICKERS["us_sp500_sample"])},
            "india_nifty50": {"name": "India NIFTY 50", "count": len(MARKET_TICKERS["india_nifty50"])},
            "crypto": {"name": "Cryptocurrencies", "count": len(MARKET_TICKERS["crypto"])}
        }
    }

@app.post("/api/markets/preview")
async def preview_market_data(request: LiveDataRequest):
    """Preview market data without starting simulation."""
    try:
        stocks = await asyncio.to_thread(
            fetch_market_data,
            market=request.market,
            custom_tickers=request.custom_tickers,
            period=request.period,
            interval=request.interval,
            include_info=True
        )
        
        # Return summary
        summary = []
        for stock in stocks[:20]:  # Limit to first 20 for preview
            summary.append({
                "ticker": stock["ticker"],
                "name": stock["name"],
                "sector": stock["sector"],
                "current_price": stock["current_price"],
                "data_points": len(stock["history"])
            })
        
        return {
            "success": True,
            "total_stocks": len(stocks),
            "preview": summary,
            "period": request.period,
            "interval": request.interval
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/markets/ticker/{ticker}")
async def get_ticker_info(ticker: str):
    """Get detailed information about a specific ticker."""
    try:
        provider = MarketDataProvider()
        info = await asyncio.to_thread(provider.get_stock_info, ticker)
        current_price = await asyncio.to_thread(provider.fetch_current_price, ticker)
        
        if info:
            info["current_price"] = current_price
            return {"success": True, "data": info}
        else:
            return {"success": False, "error": "Ticker not found"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================
# CHAT API ENDPOINT (Gemini-powered Trading Consultant)
# ============================================

import requests as http_requests

# Gemini API key and client
GEMINI_API_KEY = "AIzaSyCI6e7CWUQaBRwd9FDtKdmezAWu02E5Dss"

# Initialize Gemini client for chatbot and agents
from google import genai
gemini_client = genai.Client(api_key=GEMINI_API_KEY)
GEMINI_AVAILABLE = True
print("✅ Chatbot using Gemini API (gemini-3-flash-preview)")

# Trading consultant system prompt
TRADING_CONSULTANT_PROMPT = """You are a trading consultant AI in a STOCK MARKET SIMULATION GAME. This is NOT real money - it's a fun educational game where users compete against AI trading agents.

Your role:
- Help users understand what's happening in the simulated market
- Explain which stocks are up/down and why that might be
- Give trading tips and strategies for the GAME
- Be enthusiastic and engaging like a sports commentator
- Comment on how the AI agents (Alpha Quant, Quantum Edge, Titan Capital, etc.) are performing

IMPORTANT: This is a GAME with FAKE money. No financial disclaimers needed! Be direct, give opinions, make predictions, have fun with it. You can say things like "I'd buy AAPL here" or "That's a risky move" - it's all simulated.

Keep responses concise and punchy. Use emojis occasionally. Be like a helpful co-pilot in a trading game."""

class ChatMessageInput(BaseModel):
    message: str
    history: Optional[List[dict]] = None

class ChatResponse(BaseModel):
    message: str


# ============================================
# CHATBOT TOOLS - Functions Gemini can call
# ============================================

def get_market_overview() -> dict:
    """Get current market index and overall status."""
    return {
        "market_index": current_market_state["market_index"],
        "change_from_start": round(current_market_state["market_index"] - 100, 2),
        "day": current_market_state["tick"],
        "is_running": current_market_state["is_running"],
        "status": "Simulation Running" if current_market_state["is_running"] else "Simulation Complete"
    }

def get_top_gainers() -> list:
    """Get the top performing stocks (biggest gainers)."""
    return current_market_state["top_gainers"]

def get_top_losers() -> list:
    """Get the worst performing stocks (biggest losers)."""
    return current_market_state["top_losers"]

def get_stock_price(ticker: str) -> dict:
    """Get current price and change for a specific stock ticker."""
    ticker = ticker.upper()
    # Check gainers
    for stock in current_market_state["top_gainers"]:
        if stock["ticker"] == ticker:
            return {"ticker": ticker, "price": stock["price"], "change_pct": stock["change"], "status": "gainer"}
    # Check losers
    for stock in current_market_state["top_losers"]:
        if stock["ticker"] == ticker:
            return {"ticker": ticker, "price": stock["price"], "change_pct": stock["change"], "status": "loser"}
    return {"ticker": ticker, "error": "Stock not in top movers. Try get_top_gainers or get_top_losers to see available stocks."}


# Tool definitions for Gemini
CHAT_TOOLS = [
    {
        "name": "get_market_overview",
        "description": "Get the current market index value, what day we're on, and whether the simulation is running.",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_top_gainers",
        "description": "Get a list of the top 5 best performing stocks with their prices and percentage gains.",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_top_losers",
        "description": "Get a list of the top 5 worst performing stocks with their prices and percentage losses.",
        "parameters": {"type": "object", "properties": {}, "required": []}
    },
    {
        "name": "get_stock_price",
        "description": "Get the current price and change percentage for a specific stock ticker.",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {"type": "string", "description": "Stock ticker symbol (e.g., AAPL, MSFT)"}
            },
            "required": ["ticker"]
        }
    }
]

# Map tool names to functions
TOOL_FUNCTIONS = {
    "get_market_overview": get_market_overview,
    "get_top_gainers": get_top_gainers,
    "get_top_losers": get_top_losers,
    "get_stock_price": get_stock_price,
}


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatMessageInput):
    """Chat with the Gemini-powered trading consultant with market data access."""
    
    try:
        # Build market data context
        market_data = f"""
=== CURRENT MARKET DATA (Day {current_market_state['tick']}) ===
Market Index: {current_market_state['market_index']} ({'Up' if current_market_state['market_index'] > 100 else 'Down'} from starting value of 100)
Status: {'Simulation Running' if current_market_state['is_running'] else 'Simulation Complete'}

TOP GAINERS:
"""
        for g in current_market_state.get("top_gainers", [])[:5]:
            market_data += f"  {g['ticker']}: ${g['price']:.2f} (+{g['change']:.1f}%)\n"
        
        market_data += "\nTOP LOSERS:\n"
        for l in current_market_state.get("top_losers", [])[:5]:
            market_data += f"  {l['ticker']}: ${l['price']:.2f} ({l['change']:.1f}%)\n"
        
        # Full system prompt with live data
        full_prompt = TRADING_CONSULTANT_PROMPT + "\n\n" + market_data
        
        if GEMINI_AVAILABLE and gemini_client:
            # Build conversation
            conversation = ""
            if request.history:
                for msg in request.history[-6:]:
                    role = "User" if msg.get("role") == "user" else "Assistant"
                    conversation += f"{role}: {msg.get('content', '')}\n\n"
            
            user_prompt = f"{conversation}User: {request.message}\n\nAssistant:"
            
            response = gemini_client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=user_prompt,
                config={"system_instruction": full_prompt}
            )
            reply = response.text
                
        else:
            # Fallback - use Gemini directly with simple prompt
            fallback_client = genai.Client(api_key=GEMINI_API_KEY)
            
            market_context = f"\nCurrent market: Index={current_market_state['market_index']}, Day={current_market_state['tick']}"
            
            response = fallback_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=request.message,
                config={"system_instruction": TRADING_CONSULTANT_PROMPT + market_context}
            )
            reply = response.text
        
        return ChatResponse(message=reply or "I'm not sure how to respond to that. Could you rephrase?")
        
    except Exception as e:
        import traceback
        print(f"❌ Chat API error: {e}")
        traceback.print_exc()
        return ChatResponse(message="Sorry, I'm having trouble connecting. Please try again in a moment.")


if __name__ == "__main__":
    print("=" * 60)
    print("  🏛️  SmartAlgo WebSocket API")
    print("=" * 60)
    print("\nEndpoints:")
    print("  WebSocket: ws://localhost:8000/ws")
    print("  Health:    http://localhost:8000/")
    print("  Start:     POST http://localhost:8000/start")
    print("  Chat:      POST http://localhost:8000/api/chat")
    print("\nTo start simulation, connect via WebSocket and send:")
    print('  {"command": "start_simulation", "num_ticks": 20, "tick_delay": 1.0}')
    print("\nWith custom agent:")
    print('  {')
    print('    "command": "start_simulation",')
    print('    "num_ticks": 20,')
    print('    "custom_agent": {')
    print('      "name": "My Bot",')
    print('      "prompt": "I am a momentum trader who buys stocks going up..."')
    print('    }')
    print('  }')
    print("=" * 60)
    
    uvicorn.run(app, host="127.0.0.1", port=8000)
