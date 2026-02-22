"""
Test script for live data functionality using yfinance.

This script demonstrates:
1. Fetching live stock data
2. Getting historical prices
3. Using the data in simulation format
"""

from market_data import (
    MarketDataProvider, 
    fetch_market_data, 
    MARKET_TICKERS
)

def test_single_stock():
    """Test fetching data for a single stock."""
    print("\n" + "="*60)
    print("TEST 1: Single Stock Data (AAPL)")
    print("="*60)
    
    provider = MarketDataProvider()
    
    # Get current price
    price = provider.fetch_current_price('AAPL')
    print(f"✅ Current AAPL price: ${price:.2f}")
    
    # Get historical data
    history = provider.fetch_historical_prices('AAPL', period='1mo', interval='1d')
    print(f"✅ Historical data points: {len(history)}")
    print(f"   First: ${history[0]:.2f}, Last: ${history[-1]:.2f}")
    print(f"   Change: {((history[-1] - history[0]) / history[0] * 100):+.2f}%")


def test_multiple_stocks():
    """Test fetching data for multiple stocks."""
    print("\n" + "="*60)
    print("TEST 2: Multiple Stocks (US Tech)")
    print("="*60)
    
    stocks = fetch_market_data(
        market='us_tech',
        period='3mo',
        interval='1d',
        include_info=True
    )
    
    print(f"✅ Fetched {len(stocks)} stocks")
    print("\nStock Summary:")
    print("-" * 60)
    
    for stock in stocks[:5]:  # Show first 5
        change = ((stock['current_price'] - stock['history'][0]) / stock['history'][0] * 100) if stock['history'] else 0
        print(f"  {stock['ticker']:6} | {stock['name']:20} | ${stock['current_price']:8.2f} | {change:+6.2f}%")
        print(f"         | Sector: {stock['sector']:15} | Data points: {len(stock['history'])}")


def test_indian_market():
    """Test fetching Indian market data."""
    print("\n" + "="*60)
    print("TEST 3: Indian Market (NIFTY 50 Sample)")
    print("="*60)
    
    stocks = fetch_market_data(
        market='india_nifty50',
        period='6mo',
        interval='1wk',
        include_info=True
    )
    
    print(f"✅ Fetched {len(stocks)} Indian stocks")
    print("\nTop 3 Stocks:")
    print("-" * 60)
    
    for stock in stocks[:3]:
        change = ((stock['current_price'] - stock['history'][0]) / stock['history'][0] * 100) if stock['history'] else 0
        print(f"  {stock['ticker']:15} | {stock['name']:25}")
        print(f"  Price: ₹{stock['current_price']:.2f} | Change: {change:+.2f}% | Points: {len(stock['history'])}")


def test_custom_tickers():
    """Test fetching custom ticker list."""
    print("\n" + "="*60)
    print("TEST 4: Custom Tickers")
    print("="*60)
    
    custom = ['TSLA', 'NVDA', 'AMD', 'PLTR']
    stocks = fetch_market_data(
        custom_tickers=custom,
        period='1y',
        interval='1wk',
        include_info=True
    )
    
    print(f"✅ Fetched {len(stocks)} custom stocks")
    
    for stock in stocks:
        change = ((stock['current_price'] - stock['history'][0]) / stock['history'][0] * 100) if stock['history'] else 0
        print(f"  {stock['ticker']:6} | ${stock['current_price']:8.2f} | {change:+6.2f}% (1Y)")


def test_crypto():
    """Test fetching cryptocurrency data."""
    print("\n" + "="*60)
    print("TEST 5: Cryptocurrency Data")
    print("="*60)
    
    stocks = fetch_market_data(
        market='crypto',
        period='1mo',
        interval='1d',
        include_info=False
    )
    
    print(f"✅ Fetched {len(stocks)} cryptocurrencies")
    
    for stock in stocks[:5]:
        change = ((stock['current_price'] - stock['history'][0]) / stock['history'][0] * 100) if stock['history'] else 0
        print(f"  {stock['ticker']:10} | ${stock['current_price']:12,.2f} | {change:+6.2f}%")


def show_available_markets():
    """Show all available predefined markets."""
    print("\n" + "="*60)
    print("AVAILABLE MARKETS")
    print("="*60)
    
    for market, tickers in MARKET_TICKERS.items():
        print(f"\n{market.upper()}")
        print(f"  Tickers: {', '.join(tickers[:5])}{'...' if len(tickers) > 5 else ''}")
        print(f"  Total: {len(tickers)} stocks")


if __name__ == "__main__":
    print("\n" + "🚀"*30)
    print("LIVE DATA TESTING SUITE")
    print("🚀"*30)
    
    try:
        show_available_markets()
        test_single_stock()
        test_multiple_stocks()
        test_indian_market()
        test_custom_tickers()
        test_crypto()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
        print("="*60)
        
        print("\n💡 USAGE TIPS:")
        print("  - Use 'us_tech' for US tech giants")
        print("  - Use 'india_nifty50' for Indian stocks (add .NS suffix)")
        print("  - Use 'crypto' for cryptocurrencies")
        print("  - Use custom_tickers for your own list")
        print("  - Adjust period (1mo, 3mo, 6mo, 1y, 2y, 5y)")
        print("  - Adjust interval (1d, 1wk, 1mo for daily/weekly/monthly)")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("Make sure you have internet connection and yfinance is installed.")
