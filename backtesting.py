"""
Deterministic Strategy Backtesting Engine for MarketMind.

Evaluates trading strategies on historical stock price data (no LLM calls).
Computes performance metrics including benchmark comparison and alpha.
"""

import math
import csv
from pathlib import Path
from dataclasses import dataclass, field


# =============================================================================
# Data Models
# =============================================================================

@dataclass
class Trade:
    """A single executed trade."""
    tick: int
    ticker: str
    action: str          # "BUY" or "SELL"
    price: float
    shares: int
    value: float         # price * shares
    portfolio_value: float  # total portfolio value after this trade


@dataclass
class TickSnapshot:
    """Portfolio state at a single tick."""
    tick: int
    value: float


# =============================================================================
# Strategy Implementations (Pure Deterministic Logic)
# =============================================================================

def _avg(prices: list[float]) -> float:
    return sum(prices) / len(prices) if prices else 0.0


def strategy_contrarian(
    ticker: str,
    current_price: float,
    price_history: list[float],
    holdings: dict[str, int],
) -> str:
    """Buy when price drops >5% below historical average, sell when >5% above."""
    if len(price_history) < 2:
        return "HOLD"
    avg_price = _avg(price_history)
    if avg_price == 0:
        return "HOLD"
    deviation = (current_price - avg_price) / avg_price
    if deviation < -0.05 and ticker not in holdings:
        return "BUY"
    if deviation > 0.05 and ticker in holdings:
        return "SELL"
    return "HOLD"


def strategy_momentum(
    ticker: str,
    current_price: float,
    price_history: list[float],
    holdings: dict[str, int],
) -> str:
    """Legacy stub — momentum now uses portfolio-level logic in run_backtest."""
    return "HOLD"


# =============================================================================
# Enhanced Momentum — Portfolio-Level Strategy
# =============================================================================

MAX_MOMENTUM_POSITIONS = 3
MOMENTUM_STOP_LOSS = -0.04      # Sell if price drops 4% below entry
MOMENTUM_TAKE_PROFIT = 0.08     # Sell if price rises 8% above entry
MOMENTUM_REBALANCE_INTERVAL = 2 # Rebalance every 2 ticks

def _compute_momentum_scores(
    ticker_list: list[str],
    current_prices: dict[str, float],
    histories: dict[str, list[float]],
) -> list[tuple[str, float]]:
    """Rank all stocks by 3-tick momentum, descending."""
    scored: list[tuple[str, float]] = []
    for ticker in ticker_list:
        history = histories[ticker]
        if len(history) < 4:  # need at least 4 points (current + 3 back)
            continue
        base_price = history[-4]  # price 3 ticks ago
        if base_price <= 0:
            continue
        score = (current_prices[ticker] - base_price) / base_price
        scored.append((ticker, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored


def _run_momentum_tick(
    tick: int,
    ticker_list: list[str],
    current_prices: dict[str, float],
    histories: dict[str, list[float]],
    cash: float,
    holdings: dict[str, int],
    entry_prices: dict[str, float],
    trades: list["Trade"],
) -> float:
    """
    Execute one tick of the enhanced momentum strategy.
    Mutates holdings, entry_prices, trades in place.
    Returns updated cash.
    """

    # --- 1. Compute rankings ---
    ranked = _compute_momentum_scores(ticker_list, current_prices, histories)
    top_tickers = {t for t, _ in ranked[:MAX_MOMENTUM_POSITIONS]}
    momentum_map = {t: s for t, s in ranked}

    def _portfolio_value() -> float:
        return cash + sum(holdings.get(t, 0) * current_prices[t] for t in ticker_list)

    # --- 2. EXIT phase (stop-loss / take-profit / momentum exit) ---
    tickers_to_sell = []
    for ticker in list(holdings.keys()):
        if holdings[ticker] <= 0:
            continue
        entry = entry_prices.get(ticker, current_prices[ticker])
        price = current_prices[ticker]
        if entry > 0:
            pnl_pct = (price - entry) / entry
        else:
            pnl_pct = 0.0
        mom_score = momentum_map.get(ticker, 0.0)

        # Stop-loss
        if pnl_pct <= MOMENTUM_STOP_LOSS:
            tickers_to_sell.append((ticker, "stop-loss"))
        # Take-profit
        elif pnl_pct >= MOMENTUM_TAKE_PROFIT:
            tickers_to_sell.append((ticker, "take-profit"))
        # Momentum turns negative
        elif mom_score < 0:
            tickers_to_sell.append((ticker, "mom-exit"))

    # Rebalance: every N ticks, sell holdings not in top-3
    if tick > 0 and tick % MOMENTUM_REBALANCE_INTERVAL == 0:
        for ticker in list(holdings.keys()):
            if holdings[ticker] > 0 and ticker not in top_tickers:
                if not any(t == ticker for t, _ in tickers_to_sell):
                    tickers_to_sell.append((ticker, "rebalance"))

    # Execute sells
    for ticker, _reason in tickers_to_sell:
        shares = holdings.get(ticker, 0)
        if shares <= 0:
            continue
        revenue = current_prices[ticker] * shares
        cash += revenue
        del holdings[ticker]
        entry_prices.pop(ticker, None)
        trades.append(Trade(
            tick=tick, ticker=ticker, action="SELL",
            price=round(current_prices[ticker], 2), shares=shares,
            value=round(revenue, 2), portfolio_value=round(_portfolio_value(), 2),
        ))

    # --- 3. BUY phase (top-ranked, up to max positions) ---
    open_positions = sum(1 for v in holdings.values() if v > 0)
    slots_available = MAX_MOMENTUM_POSITIONS - open_positions

    if slots_available > 0:
        # Equal capital allocation across max positions
        total_equity = _portfolio_value()
        per_slot_capital = total_equity / MAX_MOMENTUM_POSITIONS

        for ticker, score in ranked:
            if slots_available <= 0:
                break
            if score <= 0:
                break  # only buy positive momentum
            if ticker in holdings and holdings[ticker] > 0:
                continue  # already held

            price = current_prices[ticker]
            if price <= 0:
                continue
            shares = int(per_slot_capital // price)
            if shares <= 0:
                continue
            cost = price * shares
            if cash < cost:
                # Try smaller size
                shares = int(cash // price)
                if shares <= 0:
                    continue
                cost = price * shares

            cash -= cost
            holdings[ticker] = shares
            entry_prices[ticker] = price
            trades.append(Trade(
                tick=tick, ticker=ticker, action="BUY",
                price=round(price, 2), shares=shares,
                value=round(cost, 2), portfolio_value=round(_portfolio_value(), 2),
            ))
            slots_available -= 1

    return cash


def strategy_value_hunter(
    ticker: str,
    current_price: float,
    price_history: list[float],
    holdings: dict[str, int],
) -> str:
    """Buy below average (undervalued), sell above average (overvalued)."""
    if len(price_history) < 3:
        return "HOLD"
    avg_price = _avg(price_history)
    if avg_price == 0:
        return "HOLD"
    ratio = current_price / avg_price
    if ratio < 0.97 and ticker not in holdings:
        return "BUY"
    if ratio > 1.04 and ticker in holdings:
        return "SELL"
    return "HOLD"


def strategy_sector_rotator(
    ticker: str,
    current_price: float,
    price_history: list[float],
    holdings: dict[str, int],
    sector_performance: dict[str, float] | None = None,
    stock_sector: str | None = None,
) -> str:
    """Buy stocks in the strongest sector, sell stocks in the weakest sector."""
    if not sector_performance or not stock_sector:
        return "HOLD"
    sorted_sectors = sorted(sector_performance.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_sectors) < 2:
        return "HOLD"
    best_sector = sorted_sectors[0][0]
    worst_sector = sorted_sectors[-1][0]
    if stock_sector == best_sector and ticker not in holdings:
        return "BUY"
    if stock_sector == worst_sector and ticker in holdings:
        return "SELL"
    return "HOLD"


def strategy_yolo(
    ticker: str,
    current_price: float,
    price_history: list[float],
    holdings: dict[str, int],
) -> str:
    """Aggressively buy the biggest movers."""
    if len(price_history) < 2:
        return "HOLD"
    last_change = (current_price - price_history[-1]) / price_history[-1]
    # Buy big movers going up
    if last_change > 0.03 and ticker not in holdings:
        return "BUY"
    # Sell if going down hard
    if last_change < -0.03 and ticker in holdings:
        return "SELL"
    return "HOLD"


STRATEGIES = {
    "contrarian": strategy_contrarian,
    "momentum": strategy_momentum,
    "value_hunter": strategy_value_hunter,
    "sector_rotator": strategy_sector_rotator,
    "yolo": strategy_yolo,
}


# =============================================================================
# Data Loading (reuses same CSV format as server.py)
# =============================================================================

def load_historical_data(market_type: str = "nifty50") -> list[dict]:
    """Load stock data from CSV, returning list of stock dicts with price history."""
    market_files = {
        "nifty50": "stocks_nifty50.csv",
        "banknifty": "stocks_banknifty.csv",
        "sensex": "stocks_sensex.csv",
        "finnifty": "stocks_finnifty.csv",
        "bankex": "stocks_bankex.csv",
    }
    csv_file = market_files.get(market_type, market_files["nifty50"])
    csv_path = Path(__file__).parent / csv_file

    stocks = []
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Build full price series: price_12 (oldest) → price_1 → current_price
            prices = []
            for i in range(12, 0, -1):
                key = f"price_{i}"
                if key in row:
                    prices.append(float(row[key]))
            prices.append(float(row["current_price"]))

            stocks.append({
                "ticker": row["ticker"],
                "name": row["name"],
                "sector": row["sector"],
                "prices": prices,  # 13 data points (12 historical + current)
            })
    return stocks


# =============================================================================
# Benchmark: Equal-Weight Buy-and-Hold
# =============================================================================

def compute_benchmark(
    stocks: list[dict],
    tickers: list[str],
    initial_capital: float,
) -> tuple[list[TickSnapshot], float]:
    """
    Invest initial_capital equally across selected tickers at tick 0,
    hold until the final tick.

    Returns (equity_curve, benchmark_return_pct).
    """
    selected = [s for s in stocks if s["ticker"] in tickers]
    if not selected:
        # Fallback: use all stocks
        selected = stocks

    num_ticks = len(selected[0]["prices"])
    per_stock_capital = initial_capital / len(selected)

    # At tick 0: buy as many fractional shares as possible at opening price
    shares_held: dict[str, float] = {}
    for s in selected:
        open_price = s["prices"][0]
        if open_price > 0:
            shares_held[s["ticker"]] = per_stock_capital / open_price
        else:
            shares_held[s["ticker"]] = 0.0

    # Build equity curve
    equity_curve: list[TickSnapshot] = []
    for tick in range(num_ticks):
        total_value = 0.0
        for s in selected:
            total_value += shares_held.get(s["ticker"], 0) * s["prices"][tick]
        equity_curve.append(TickSnapshot(tick=tick, value=round(total_value, 2)))

    benchmark_return = 0.0
    if equity_curve and equity_curve[0].value > 0:
        benchmark_return = (
            (equity_curve[-1].value - equity_curve[0].value) / equity_curve[0].value
        ) * 100

    return equity_curve, round(benchmark_return, 4)


# =============================================================================
# Performance Metrics
# =============================================================================

def compute_metrics(
    equity_curve: list[TickSnapshot],
    trades: list[Trade],
    initial_capital: float,
    benchmark_return: float,
) -> dict:
    """Compute all quantitative performance metrics."""
    if len(equity_curve) < 2:
        return {
            "total_return": 0, "annualized_return": 0, "sharpe_ratio": 0,
            "max_drawdown": 0, "volatility": 0, "win_rate": 0,
            "total_trades": 0, "benchmark_return": benchmark_return, "alpha": 0,
        }

    values = [e.value for e in equity_curve]
    final_value = values[-1]

    # Total return
    total_return = ((final_value - initial_capital) / initial_capital) * 100

    # Daily returns
    daily_returns = []
    for i in range(1, len(values)):
        if values[i - 1] > 0:
            daily_returns.append((values[i] - values[i - 1]) / values[i - 1])

    # Annualized return (assume 252 trading days/year, each tick = 1 day)
    n_days = len(daily_returns)
    if n_days > 0 and final_value > 0 and initial_capital > 0:
        annualized_return = ((final_value / initial_capital) ** (252 / n_days) - 1) * 100
    else:
        annualized_return = 0.0

    # Volatility (std dev of daily returns, annualized)
    if len(daily_returns) > 1:
        mean_ret = sum(daily_returns) / len(daily_returns)
        variance = sum((r - mean_ret) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        daily_vol = math.sqrt(variance)
        volatility = daily_vol * math.sqrt(252) * 100  # annualized %
    else:
        daily_vol = 0.0
        volatility = 0.0

    # Sharpe ratio (risk-free rate = 0)
    if daily_vol > 0 and len(daily_returns) > 0:
        mean_daily = sum(daily_returns) / len(daily_returns)
        sharpe_ratio = (mean_daily / daily_vol) * math.sqrt(252)
    else:
        sharpe_ratio = 0.0

    # Max drawdown
    peak = values[0]
    max_drawdown = 0.0
    for v in values:
        if v > peak:
            peak = v
        drawdown = ((peak - v) / peak) * 100 if peak > 0 else 0
        if drawdown > max_drawdown:
            max_drawdown = drawdown

    # Win rate
    sell_trades = [t for t in trades if t.action == "SELL"]
    if sell_trades:
        # A sell is "winning" if sell price > average buy price for that ticker
        buy_prices: dict[str, list[float]] = {}
        wins = 0
        for t in trades:
            if t.action == "BUY":
                buy_prices.setdefault(t.ticker, []).append(t.price)
        for t in sell_trades:
            avg_buy = _avg(buy_prices.get(t.ticker, []))
            if t.price > avg_buy:
                wins += 1
        win_rate = (wins / len(sell_trades)) * 100
    else:
        win_rate = 0.0

    # Alpha
    alpha = total_return - benchmark_return

    return {
        "total_return": round(total_return, 4),
        "annualized_return": round(annualized_return, 4),
        "sharpe_ratio": round(sharpe_ratio, 4),
        "max_drawdown": round(max_drawdown, 4),
        "volatility": round(volatility, 4),
        "win_rate": round(win_rate, 2),
        "total_trades": len(trades),
        "benchmark_return": round(benchmark_return, 4),
        "alpha": round(alpha, 4),
    }


# =============================================================================
# Main Backtest Runner
# =============================================================================

POSITION_SIZE = 10  # Fixed shares per trade (used by non-momentum strategies)

# Portfolio-level strategies bypass the per-stock loop
_PORTFOLIO_STRATEGIES = {"momentum"}

def run_backtest(
    strategy_name: str,
    market_type: str = "nifty50",
    tickers: list[str] | None = None,
    initial_capital: float = 100_000.0,
) -> dict:
    """
    Run a full backtest synchronously (call via asyncio.to_thread).

    Args:
        strategy_name: One of 'contrarian', 'momentum', 'value_hunter', 'sector_rotator', 'yolo'
        market_type: Market index CSV to use
        tickers: Optional subset of stock tickers (defaults to all)
        initial_capital: Starting cash ($100,000 default)

    Returns:
        Dict with keys: equity_curve, benchmark_curve, trades, metrics, config
    """
    if strategy_name not in STRATEGIES:
        raise ValueError(f"Unknown strategy '{strategy_name}'. Choose from: {list(STRATEGIES.keys())}")

    strategy_fn = STRATEGIES[strategy_name]
    all_stocks = load_historical_data(market_type)

    # Filter tickers if specified
    if tickers:
        stocks = [s for s in all_stocks if s["ticker"] in tickers]
        if not stocks:
            stocks = all_stocks  # fallback
    else:
        stocks = all_stocks

    ticker_list = [s["ticker"] for s in stocks]
    stock_map = {s["ticker"]: s for s in stocks}
    num_ticks = len(stocks[0]["prices"])  # 13 data points

    # Pre-compute sector performance per tick (for sector_rotator)
    sectors: dict[str, list[str]] = {}
    for s in stocks:
        sectors.setdefault(s["sector"], []).append(s["ticker"])

    # Portfolio state
    cash = initial_capital
    holdings: dict[str, int] = {}   # ticker → shares
    trades: list[Trade] = []
    equity_curve: list[TickSnapshot] = []

    # Extra state for portfolio-level momentum
    entry_prices: dict[str, float] = {}  # ticker → buy price

    # Tick-by-tick simulation
    for tick in range(num_ticks):
        # Current prices at this tick
        current_prices = {s["ticker"]: s["prices"][tick] for s in stocks}

        # Price history up to this tick (inclusive)
        histories = {s["ticker"]: s["prices"][: tick + 1] for s in stocks}

        # -------------------------------------------------------
        # PORTFOLIO-LEVEL strategies (momentum)
        # -------------------------------------------------------
        if strategy_name in _PORTFOLIO_STRATEGIES:
            cash = _run_momentum_tick(
                tick, ticker_list, current_prices, histories,
                cash, holdings, entry_prices, trades,
            )
        else:
            # -------------------------------------------------------
            # PER-STOCK strategies (contrarian, value_hunter, etc.)
            # -------------------------------------------------------
            # Compute sector performance for this tick (for sector_rotator)
            sector_perf: dict[str, float] = {}
            if tick > 0:
                for sector, sector_tickers in sectors.items():
                    perf_sum = 0.0
                    count = 0
                    for t in sector_tickers:
                        s_data = stock_map[t]
                        if s_data["prices"][0] > 0:
                            perf_sum += (s_data["prices"][tick] - s_data["prices"][0]) / s_data["prices"][0]
                            count += 1
                    if count > 0:
                        sector_perf[sector] = perf_sum / count

            # Evaluate strategy for each stock
            for ticker in ticker_list:
                current_price = current_prices[ticker]
                history = histories[ticker]
                stock_sector = stock_map[ticker]["sector"]

                # Get strategy signal
                if strategy_name == "sector_rotator":
                    signal = strategy_fn(
                        ticker, current_price, history, holdings,
                        sector_performance=sector_perf, stock_sector=stock_sector,
                    )
                else:
                    signal = strategy_fn(ticker, current_price, history, holdings)

                # Execute trade
                if signal == "BUY" and current_price > 0:
                    cost = current_price * POSITION_SIZE
                    if cash >= cost:
                        cash -= cost
                        holdings[ticker] = holdings.get(ticker, 0) + POSITION_SIZE
                        portfolio_val = cash + sum(
                            holdings.get(t, 0) * current_prices[t] for t in ticker_list
                        )
                        trades.append(Trade(
                            tick=tick, ticker=ticker, action="BUY",
                            price=round(current_price, 2), shares=POSITION_SIZE,
                            value=round(cost, 2), portfolio_value=round(portfolio_val, 2),
                        ))

                elif signal == "SELL" and ticker in holdings and holdings[ticker] > 0:
                    sell_shares = min(POSITION_SIZE, holdings[ticker])
                    revenue = current_price * sell_shares
                    cash += revenue
                    holdings[ticker] -= sell_shares
                    if holdings[ticker] <= 0:
                        del holdings[ticker]
                    portfolio_val = cash + sum(
                        holdings.get(t, 0) * current_prices[t] for t in ticker_list
                    )
                    trades.append(Trade(
                        tick=tick, ticker=ticker, action="SELL",
                        price=round(current_price, 2), shares=sell_shares,
                        value=round(revenue, 2), portfolio_value=round(portfolio_val, 2),
                    ))

        # Record portfolio value at end of tick
        total_value = cash + sum(
            holdings.get(t, 0) * current_prices[t] for t in ticker_list
        )
        equity_curve.append(TickSnapshot(tick=tick, value=round(total_value, 2)))

    # Compute benchmark
    benchmark_curve, benchmark_return = compute_benchmark(stocks, ticker_list, initial_capital)

    # Compute metrics
    metrics = compute_metrics(equity_curve, trades, initial_capital, benchmark_return)

    return {
        "equity_curve": [{"tick": e.tick, "value": e.value} for e in equity_curve],
        "benchmark_curve": [{"tick": e.tick, "value": e.value} for e in benchmark_curve],
        "trades": [
            {
                "tick": t.tick, "ticker": t.ticker, "action": t.action,
                "price": t.price, "shares": t.shares, "value": t.value,
                "portfolio_value": t.portfolio_value,
            }
            for t in trades
        ],
        "metrics": metrics,
        "config": {
            "strategy": strategy_name,
            "market_type": market_type,
            "tickers": ticker_list,
            "initial_capital": initial_capital,
            "position_size": POSITION_SIZE,
            "num_ticks": num_ticks,
        },
    }


# =============================================================================
# Quick test
# =============================================================================

if __name__ == "__main__":
    import json
    print("=" * 60)
    print("  🧪 Backtesting Engine — Quick Test")
    print("=" * 60)

    for name in STRATEGIES:
        result = run_backtest(name, "nifty50")
        m = result["metrics"]
        print(f"\n📊 {name.upper()}")
        print(f"   Return: {m['total_return']:+.2f}%  |  Benchmark: {m['benchmark_return']:+.2f}%  |  Alpha: {m['alpha']:+.2f}%")
        print(f"   Sharpe: {m['sharpe_ratio']:.2f}  |  MaxDD: {m['max_drawdown']:.2f}%  |  Trades: {m['total_trades']}")

    print("\n✅ All strategies tested successfully")
