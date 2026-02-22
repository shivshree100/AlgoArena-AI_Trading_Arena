"""
Example: Running a simulation with live data from yfinance.

This demonstrates how to use real stock data instead of simulated CSV data.
"""

import asyncio
from market_data import fetch_market_data
from orchestration import SimulationOrchestrator, Side
from order_book import create_order_books
from agents import create_agent

async def run_live_simulation_example():
    """Run a simple simulation with live data."""
    
    print("\n" + "="*60)
    print("LIVE DATA SIMULATION EXAMPLE")
    print("="*60)
    
    # Step 1: Fetch live data
    print("\n📡 Fetching live data from yfinance...")
    stocks = fetch_market_data(
        market='us_tech',
        period='3mo',
        interval='1d',
        include_info=True
    )
    
    if not stocks:
        print("❌ Failed to fetch data")
        return
    
    print(f"✅ Loaded {len(stocks)} stocks")
    
    # Step 2: Prepare simulation
    tickers = [s['ticker'] for s in stocks]
    initial_prices = {s['ticker']: s['current_price'] for s in stocks}
    stock_history = {s['ticker']: s['history'] for s in stocks}
    
    print(f"\n📊 Market Overview:")
    for stock in stocks[:5]:
        print(f"  {stock['ticker']:6} | ${stock['current_price']:8.2f} | {stock['name']}")
    
    # Step 3: Setup orchestrator
    print(f"\n🎮 Setting up simulation...")
    orchestrator = SimulationOrchestrator()
    order_books = create_order_books(tickers, initial_prices, price_impact=0.0005, volatility=0.02)
    
    for ticker, book in order_books.items():
        orchestrator.register_stock(ticker, book)
    
    # Register agents
    orchestrator.register_agent("quant_trader", initial_cash=100000.0)
    orchestrator.register_agent("value_investor", initial_cash=100000.0)
    
    # Give starting positions
    for ticker in tickers[:5]:  # First 5 stocks
        orchestrator._agent_portfolios["quant_trader"].positions[ticker] = 10
        orchestrator._agent_portfolios["value_investor"].positions[ticker] = 10
    
    # Create AI agents
    MODEL = "gemini-2.0-flash"
    quant = create_agent("quant_trader", orchestrator, "quant_institutional", MODEL, stock_history)
    value = create_agent("value_investor", orchestrator, "fundamental_institutional", MODEL, stock_history)
    
    # Step 4: Run simulation
    print(f"\n🚀 Running simulation for 3 ticks...")
    
    for tick in range(3):
        print(f"\n{'='*60}")
        print(f"TICK {tick}")
        print(f"{'='*60}")
        
        # Agents decide
        print("\n[Quant Trader thinking...]")
        quant_actions = quant.decide(tick)
        if quant_actions:
            for action in quant_actions[:3]:  # Show first 3 actions
                print(f"  {action}")
        
        print("\n[Value Investor thinking...]")
        value_actions = value.decide(tick)
        if value_actions:
            for action in value_actions[:3]:
                print(f"  {action}")
        
        # Execute tick
        tick_log = orchestrator.run_tick()
        
        # Show results
        current_prices = {ticker: order_books[ticker].get_last_price() for ticker in tickers}
        
        print(f"\n📊 Tick Summary:")
        print(f"  Trades executed: {len(tick_log.trades)}")
        
        # Show portfolio values
        for agent_id in ["quant_trader", "value_investor"]:
            p = orchestrator.get_agent_portfolio(agent_id)
            stock_value = sum(p.positions.get(t, 0) * current_prices.get(t, 0) for t in tickers)
            total_value = p.cash + stock_value
            print(f"  {agent_id}: ${total_value:,.2f} (Cash: ${p.cash:,.2f})")
        
        await asyncio.sleep(1)
    
    # Final results
    print(f"\n{'='*60}")
    print("SIMULATION COMPLETE")
    print(f"{'='*60}")
    
    for agent_id in ["quant_trader", "value_investor"]:
        p = orchestrator.get_agent_portfolio(agent_id)
        stock_value = sum(p.positions.get(t, 0) * current_prices.get(t, 0) for t in tickers)
        total_value = p.cash + stock_value
        pnl = total_value - 100000.0
        pnl_pct = (pnl / 100000.0) * 100
        
        print(f"\n{agent_id.upper()}:")
        print(f"  Final Value: ${total_value:,.2f}")
        print(f"  P&L: ${pnl:+,.2f} ({pnl_pct:+.2f}%)")
        print(f"  Cash: ${p.cash:,.2f}")
        print(f"  Positions: {len([k for k, v in p.positions.items() if v > 0])}")


if __name__ == "__main__":
    print("\n🚀 Starting Live Data Simulation Example...")
    print("This will fetch real stock data and run a 3-tick simulation.\n")
    
    try:
        asyncio.run(run_live_simulation_example())
        print("\n✅ Example completed successfully!")
    except KeyboardInterrupt:
        print("\n⚠️ Simulation interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
