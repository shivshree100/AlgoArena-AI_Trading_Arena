"""
LLM Trading Agents using Google Gemini API.
"""

import json
from google import genai
from orchestration import SimulationOrchestrator, Side


class TradingAgent:
    """An LLM-powered trading agent that uses Google Gemini to make decisions."""
    
    # Hardcoded Gemini API key
    API_KEY = "AIzaSyCI6e7CWUQaBRwd9FDtKdmezAWu02E5Dss"
    
    def __init__(
        self,
        agent_id: str,
        orchestrator: SimulationOrchestrator,
        personality: str = "You are a rational trader.",
        model: str = "gemini-2.0-flash",
        price_history: dict = None
    ):
        self.agent_id = agent_id
        self.orchestrator = orchestrator
        self.model = model
        self.personality = personality
        self.price_history = price_history or {}
        self.gemini_client = genai.Client(api_key=self.API_KEY)
    
    def _call_llm(self, messages: list[dict]) -> str:
        # Extract system message and build prompt
        system_msg = ""
        conversation = ""
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            elif msg["role"] == "user":
                conversation += f"User: {msg['content']}\n\n"
            elif msg["role"] == "assistant":
                conversation += f"Assistant: {msg['content']}\n\n"
        
        response = self.gemini_client.models.generate_content(
            model=self.model,
            contents=conversation,
            config={"system_instruction": system_msg} if system_msg else None
        )
        
        return response.text
    
    def get_tools_description(self) -> str:
        return """
You have the following tools:

1. get_prices - Get current prices
   Usage: {"tool": "get_prices"}

2. get_history - Get last 5 historical prices (oldest to newest)
   Usage: {"tool": "get_history"}

3. get_portfolio - Get your cash and positions
   Usage: {"tool": "get_portfolio"}

5. buy - Buy a stock
   Usage: {"tool": "buy", "args": {"ticker": "AAPL", "size": 10}}

6. sell - Sell a stock
   Usage: {"tool": "sell", "args": {"ticker": "AAPL", "size": 5}}

7. get_technical_indicators - Get RSI, MA(20), Support/Resistance for all stocks
   Usage: {"tool": "get_technical_indicators"}

8. done - Finish trading
   Usage: {"tool": "done"}

Respond with ONLY valid JSON. No other text.
"""
    
    def execute_tool(self, tool_call: dict) -> dict:
        tool = tool_call.get("tool")
        args = tool_call.get("args", {})
        
        if tool == "get_prices":
            return self.orchestrator.get_snapshot()
        
        elif tool == "get_history":
            # Return last 20 prices per stock to allow for better technical analysis
            limited_history = {}
            for ticker, hist in self.price_history.items():
                if isinstance(hist, list) and len(hist) > 0:
                    limited_history[ticker] = hist[-20:]
            return limited_history
        
        elif tool == "get_technical_indicators":
            # Calculate technical indicators for the agent
            indicators = {}
            for ticker, hist in self.price_history.items():
                if len(hist) < 5:
                    continue
                
                # Simple Moving Average (SMA 10)
                sma_10 = sum(hist[-10:]) / min(len(hist), 10)
                
                # RSI (Relative Strength Index) - 14 period approximation
                rsi = 50.0  # Default
                if len(hist) >= 15:
                    deltas = [hist[i] - hist[i-1] for i in range(len(hist)-14, len(hist))]
                    gains = [d for d in deltas if d > 0]
                    losses = [abs(d) for d in deltas if d < 0]
                    avg_gain = sum(gains) / 14 if gains else 0
                    avg_loss = sum(losses) / 14 if losses else 0.00001
                    rs = avg_gain / avg_loss
                    rsi = 100 - (100 / (1 + rs))
                
                # Support and Resistance (Recent Low/High)
                lows = hist[-15:]
                support = min(lows) if lows else hist[-1]
                resistance = max(lows) if lows else hist[-1]
                
                indicators[ticker] = {
                    "current_price": hist[-1],
                    "sma_10": round(sma_10, 2),
                    "rsi": round(rsi, 2),
                    "support": round(support, 2),
                    "resistance": round(resistance, 2),
                    "sentiment": "OVERSOLD" if rsi < 30 else "OVERBOUGHT" if rsi > 70 else "NEUTRAL"
                }
            return indicators
        
        elif tool == "get_portfolio":
            portfolio = self.orchestrator.get_agent_portfolio(self.agent_id)
            if portfolio:
                return {"cash": portfolio.cash, "positions": dict(portfolio.positions)}
            return {"error": "Portfolio not found"}
        
        elif tool == "buy":
            ticker = args.get("ticker")
            size = args.get("size", 0)
            if not ticker or size <= 0:
                return {"success": False, "message": "Invalid ticker or size"}
            prices = self.orchestrator.get_snapshot()
            if ticker not in prices:
                return {"success": False, "message": f"Unknown stock: {ticker}"}
            
            # Retail pays MORE (bad execution), user bot pays ZERO premium, others pay a tiny bit
            if self.agent_id == "retail":
                price = prices[ticker] * 1.05  # Retail pays 5% premium
            elif self.agent_id == "my_agent":
                price = prices[ticker] * 1.0  # USER BOT: ZERO slippage (VIP Advantage)
            else:
                price = prices[ticker] * 1.0005
            
            success = self.orchestrator.submit_order(self.agent_id, ticker, Side.BUY, round(price, 2), int(size))
            return {"success": success, "message": f"Buy order: {size} {ticker} @ ${price:.2f}" if success else "Order rejected"}
        
        elif tool == "sell":
            ticker = args.get("ticker")
            size = args.get("size", 0)
            if not ticker or size <= 0:
                return {"success": False, "message": "Invalid ticker or size"}
            prices = self.orchestrator.get_snapshot()
            if ticker not in prices:
                return {"success": False, "message": f"Unknown stock: {ticker}"}
            
            # Retail gets LESS (bad execution), user bot gets 100% value
            if self.agent_id == "retail":
                price = prices[ticker] * 0.95  # Retail gets 5% less
            elif self.agent_id == "my_agent":
                price = prices[ticker] * 1.0  # USER BOT: ZERO slippage
            else:
                price = prices[ticker] * 0.9995
            
            success = self.orchestrator.submit_order(self.agent_id, ticker, Side.SELL, round(price, 2), int(size))
            return {"success": success, "message": f"Sell order: {size} {ticker} @ ${price:.2f}" if success else "Order rejected"}
        
        elif tool == "done":
            return {"message": "Done"}
        
        return {"error": f"Unknown tool: {tool}"}
    
    def decide(self, tick: int, max_tool_calls: int = 5, news: dict = None) -> list[dict]:
        actions = []
        
        # Build news alert if present
        news_alert = ""
        if news:
            sentiment_emoji = "🚀" if news.get("sentiment") == "positive" else "📉"
            news_alert = f"""
⚠️ BREAKING NEWS ALERT ⚠️
{sentiment_emoji} {news.get('headline', 'Market news')}
Stock affected: {news.get('stock', 'Unknown')}
Sentiment: {news.get('sentiment', 'neutral').upper()}

REACT TO THIS NEWS IMMEDIATELY! If positive, consider BUYING the stock. If negative, consider SELLING.
"""
        
        system_prompt = f"""You are {self.agent_id}, a trading agent.

{self.personality}

Current tick: {tick}
{news_alert}
{self.get_tools_description()}

Strategy:
1. Call get_portfolio and get_prices first
2. Call get_history to see trends
3. Make trading decisions based on news and data
4. Call done when finished

Respond with ONLY JSON."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Begin trading. What's your first action?"}
        ]
        
        for _ in range(max_tool_calls):
            try:
                response_text = self._call_llm(messages).strip()
                
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()
                
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start != -1 and end > start:
                    response_text = response_text[start:end]
                
                tool_call = json.loads(response_text)
                
                if tool_call.get("tool") in ["done", "pass"]:
                    break
                
                result = self.execute_tool(tool_call)
                actions.append({"tool": tool_call, "result": result})
                
                messages.append({"role": "assistant", "content": json.dumps(tool_call)})
                messages.append({"role": "user", "content": f"Result: {json.dumps(result)}\n\nNext action?"})
                
            except json.JSONDecodeError:
                print(f"  [{self.agent_id}] Invalid JSON: {response_text[:80]}...")
                break
            except Exception as e:
                print(f"  [{self.agent_id}] Error: {e}")
                break
        
        return actions


class DumbRetailHolder:
    """
    Conservative dumb retail - holds mostly, but pays fees and makes bad decisions.
    Buys falling stocks ("it's on sale!"), sells rising stocks ("take profits!").
    Trades rarely but always wrong.
    """
    
    def __init__(self, agent_id: str, orchestrator, price_history: dict = None):
        self.agent_id = agent_id
        self.orchestrator = orchestrator
        self.price_history = price_history or {}
        self._tick_count = 0
    
    def decide(self, tick: int, max_tool_calls: int = 5) -> list[dict]:
        import random
        actions = []
        prices = self.orchestrator.get_snapshot()
        portfolio = self.orchestrator.get_agent_portfolio(self.agent_id)
        
        if not prices or not portfolio:
            return actions
        
        self._tick_count += 1
        
        # Only trade every 3-4 ticks (conservative)
        if self._tick_count % random.randint(3, 4) != 0:
            return actions
        
        # Find stocks to make bad trades on
        for ticker, current in prices.items():
            hist = self.price_history.get(ticker, [])
            if not hist:
                continue
            avg = sum(hist) / len(hist)
            pct_change = (current - avg) / avg
            
            # BUY THE DIP - if stock is down 3%+, buy ("it's on sale!")
            if pct_change < -0.03 and portfolio.cash > current * 10:
                size = random.randint(5, 10)
                bad_price = current * 1.01  # Pay 1% premium
                if self.orchestrator.submit_order(self.agent_id, ticker, Side.BUY, round(bad_price, 2), size):
                    actions.append({"action": f"BUYS {size} {ticker} @ ${bad_price:.2f}"})
                break  # Only 1 trade per tick (conservative)
            
            # TAKE PROFITS - if stock is up 3%+, sell ("lock in gains!")
            elif pct_change > 0.03 and portfolio.positions.get(ticker, 0) > 0:
                size = min(random.randint(5, 10), portfolio.positions[ticker])
                bad_price = current * 0.99  # Accept 1% less
                if self.orchestrator.submit_order(self.agent_id, ticker, Side.SELL, round(bad_price, 2), size):
                    actions.append({"action": f"SELLS {size} {ticker} @ ${bad_price:.2f}"})
                break  # Only 1 trade per tick (conservative)
        
        return actions


class DumbRetailDaytrader:
    """
    Aggressive dumb retail daytrader - trades constantly, ALWAYS LOSES.
    Pays fees, has terrible execution, and makes wrong decisions.
    """
    
    def __init__(self, agent_id: str, orchestrator, price_history: dict = None):
        self.agent_id = agent_id
        self.orchestrator = orchestrator
        self.price_history = price_history or {}
    
    def decide(self, tick: int, max_tool_calls: int = 5) -> list[dict]:
        import random
        actions = []
        prices = self.orchestrator.get_snapshot()
        portfolio = self.orchestrator.get_agent_portfolio(self.agent_id)
        
        if not prices or not portfolio:
            return actions
        
        tickers = list(prices.keys())
        
        # Sort by price change to find movers
        movers = []
        for ticker in tickers:
            hist = self.price_history.get(ticker, [])
            if hist:
                avg = sum(hist) / len(hist)
                pct_change = (prices[ticker] - avg) / avg
                movers.append((ticker, pct_change, prices[ticker]))
        
        movers.sort(key=lambda x: x[1])  # Sort by change: losers first, winners last
        
        trades_this_tick = 0
        max_trades = random.randint(3, 6)  # Daytrader does 3-6 trades per tick
        
        # BUY LOSERS - "it's cheap now, it'll bounce!"
        for ticker, pct_change, current in movers[:10]:  # Biggest losers
            if trades_this_tick >= max_trades:
                break
            if pct_change < -0.01 and portfolio.cash > current * 15:
                size = random.randint(8, 15)
                bad_price = current * 1.01  # Pay 1% premium
                if self.orchestrator.submit_order(self.agent_id, ticker, Side.BUY, round(bad_price, 2), size):
                    actions.append({"action": f"BUYS {size} {ticker} @ ${bad_price:.2f}"})
                    trades_this_tick += 1
        
        # SELL WINNERS - "take profits!"
        for ticker, pct_change, current in reversed(movers[-10:]):  # Biggest winners
            if trades_this_tick >= max_trades:
                break
            if pct_change > 0.01 and portfolio.positions.get(ticker, 0) > 0:
                size = min(random.randint(8, 15), portfolio.positions[ticker])
                bad_price = current * 0.99  # Accept 1% less
                if self.orchestrator.submit_order(self.agent_id, ticker, Side.SELL, round(bad_price, 2), size):
                    actions.append({"action": f"SELLS {size} {ticker} @ ${bad_price:.2f}"})
                    trades_this_tick += 1
        
        # Random trades on top (daytrader can't sit still)
        if trades_this_tick < 2 and random.random() < 0.5:
            ticker = random.choice(tickers)
            current = prices[ticker]
            if random.random() < 0.5 and portfolio.cash > current * 10:
                size = random.randint(5, 10)
                bad_price = current * 1.01
                if self.orchestrator.submit_order(self.agent_id, ticker, Side.BUY, round(bad_price, 2), size):
                    actions.append({"action": f"BUYS {size} {ticker} @ ${bad_price:.2f}"})
            elif portfolio.positions.get(ticker, 0) > 0:
                size = min(random.randint(5, 10), portfolio.positions[ticker])
                bad_price = current * 0.99
                if self.orchestrator.submit_order(self.agent_id, ticker, Side.SELL, round(bad_price, 2), size):
                    actions.append({"action": f"SELLS {size} {ticker} @ ${bad_price:.2f}"})        
        return actions


PERSONALITIES = {
    "quant_institutional": """You are a QUANTITATIVE ALGO TRADER at a top hedge fund.
    
YOUR EDGE - STATISTICAL ARBITRAGE:
- Always call get_technical_indicators and get_portfolio first.
- IF RSI < 30 and price is near Support: BUY 15-30 shares (Mean Reversion).
- IF RSI > 70 and price is near Resistance: SELL ALL (Overbought).
- IF price breaks Resistance and RSI is between 40-60: BUY 20 shares (Momentum Breakout).

POSITION SIZING:
- Use 15-25 shares per trade.
- Keep 25% cash as dry powder.
- Cut losers immediately if Support is broken.""",

    "fundamental_institutional": """You are a FUNDAMENTAL VALUE INVESTOR.

YOUR EDGE - VALUE & S&R:
- Check get_technical_indicators.
- Buy stocks that are trading near historical SUPPORT levels.
- Sell or trim positions as they approach RESISTANCE.
- Ignore RSI noise; focus on price floors.
- Use cautious position sizes (10-20 shares).""",

    "retail_trader": """You are a RETAIL TRADER who follows popular trends.

YOUR BEHAVIOR:
- You tend to follow what's popular - buy stocks going up, sell stocks going down
- You make 1-3 trades per tick based on gut feeling and recent momentum
- Small positions (5-15 shares per trade)
- You don't always make the best timing decisions

HOW TO TRADE:
- Look at get_history to find trending stocks
- Buy 1-2 stocks that seem to be going up
- Sell holdings that seem to be going down
- Keep it simple, 1-3 trades max

Always check your portfolio first, then look at prices and history.""",
}


def create_agent(
    agent_id: str,
    orchestrator: SimulationOrchestrator,
    personality_type: str = "retail_trader",
    model: str = "gemini-2.0-flash",
    price_history: dict = None
) -> TradingAgent:
    personality = PERSONALITIES.get(personality_type, PERSONALITIES["retail_trader"])
    return TradingAgent(agent_id, orchestrator, personality, model, price_history)
