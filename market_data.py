"""
Market Data Module - Fetch live and historical stock data using yfinance.

Provides functionality to:
- Fetch real-time stock prices
- Get historical price data
- Convert data to the format used by the simulation
- Support both live data and simulated data modes
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MarketDataProvider:
    """Provides market data from yfinance API."""
    
    def __init__(self):
        self.cache = {}  # Simple cache to avoid repeated API calls
    
    def fetch_current_price(self, ticker: str) -> Optional[float]:
        """
        Fetch the current/latest price for a single ticker.
        
        Args:
            ticker: Stock ticker symbol (e.g., 'AAPL', 'RELIANCE.NS')
        
        Returns:
            Current price as float, or None if fetch fails
        """
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period='1d', interval='1m')
            
            if data.empty:
                logger.warning(f"No data available for {ticker}")
                return None
            
            current_price = data['Close'].iloc[-1]
            logger.info(f"Fetched current price for {ticker}: ${current_price:.2f}")
            return float(current_price)
        
        except Exception as e:
            logger.error(f"Error fetching current price for {ticker}: {e}")
            return None
    
    def fetch_historical_prices(
        self, 
        ticker: str, 
        period: str = "1y",
        interval: str = "1d"
    ) -> Optional[List[float]]:
        """
        Fetch historical prices for a ticker.
        
        Args:
            ticker: Stock ticker symbol
            period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)
        
        Returns:
            List of closing prices (oldest to newest), or None if fetch fails
        """
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period=period, interval=interval)
            
            if data.empty:
                logger.warning(f"No historical data available for {ticker}")
                return None
            
            prices = data['Close'].tolist()
            logger.info(f"Fetched {len(prices)} historical prices for {ticker}")
            return prices
        
        except Exception as e:
            logger.error(f"Error fetching historical data for {ticker}: {e}")
            return None
    
    def fetch_multiple_tickers(
        self, 
        tickers: List[str], 
        period: str = "1y",
        interval: str = "1d"
    ) -> Dict[str, Dict]:
        """
        Fetch historical data for multiple tickers efficiently.
        
        Args:
            tickers: List of ticker symbols
            period: Time period
            interval: Data interval
        
        Returns:
            Dictionary mapping ticker to {history: [...], current_price: float}
        """
        result = {}
        
        for ticker in tickers:
            try:
                prices = self.fetch_historical_prices(ticker, period, interval)
                
                if prices and len(prices) > 0:
                    result[ticker] = {
                        'history': prices[:-1] if len(prices) > 1 else [],
                        'current_price': prices[-1]
                    }
                else:
                    logger.warning(f"Skipping {ticker} - no data available")
            
            except Exception as e:
                logger.error(f"Error processing {ticker}: {e}")
                continue
        
        logger.info(f"Successfully fetched data for {len(result)}/{len(tickers)} tickers")
        return result
    
    def fetch_intraday_data(
        self, 
        ticker: str, 
        interval: str = "1m",
        days: int = 1
    ) -> Optional[pd.DataFrame]:
        """
        Fetch intraday (minute-level) data for live trading simulation.
        
        Args:
            ticker: Stock ticker symbol
            interval: Minute interval (1m, 2m, 5m, 15m, 30m, 60m)
            days: Number of days (max 7 for minute data)
        
        Returns:
            DataFrame with OHLCV data, or None if fetch fails
        """
        try:
            stock = yf.Ticker(ticker)
            
            # yfinance limits: 1m data for last 7 days only
            if days > 7:
                days = 7
                logger.warning(f"Limiting to 7 days for minute-level data")
            
            period = f"{days}d"
            data = stock.history(period=period, interval=interval)
            
            if data.empty:
                logger.warning(f"No intraday data available for {ticker}")
                return None
            
            logger.info(f"Fetched {len(data)} intraday data points for {ticker}")
            return data
        
        except Exception as e:
            logger.error(f"Error fetching intraday data for {ticker}: {e}")
            return None
    
    def get_stock_info(self, ticker: str) -> Optional[Dict]:
        """
        Get detailed stock information.
        
        Args:
            ticker: Stock ticker symbol
        
        Returns:
            Dictionary with stock info (name, sector, market cap, etc.)
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            return {
                'ticker': ticker,
                'name': info.get('longName', ticker),
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown'),
                'market_cap': info.get('marketCap', 0),
                'currency': info.get('currency', 'USD')
            }
        
        except Exception as e:
            logger.error(f"Error fetching info for {ticker}: {e}")
            return None


def convert_to_simulation_format(
    market_data: Dict[str, Dict],
    stock_info: Optional[Dict[str, Dict]] = None
) -> List[Dict]:
    """
    Convert yfinance data to the format expected by the simulation.
    
    Args:
        market_data: Dict from fetch_multiple_tickers
        stock_info: Optional dict mapping ticker to stock info
    
    Returns:
        List of stock dicts with format: {ticker, name, sector, history, current_price}
    """
    stocks = []
    
    for ticker, data in market_data.items():
        info = stock_info.get(ticker) if stock_info else None
        
        stock = {
            'ticker': ticker,
            'name': info.get('name', ticker) if info else ticker,
            'sector': info.get('sector', 'Unknown') if info else 'Unknown',
            'history': data['history'],
            'current_price': data['current_price']
        }
        
        stocks.append(stock)
    
    return stocks


# Predefined ticker lists for different markets
MARKET_TICKERS = {
    'us_tech': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'AMD', 'INTC'],
    'us_sp500_sample': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'BRK-B', 'JNJ', 'V', 'PG', 'JPM', 'UNH',
                        'MA', 'HD', 'DIS', 'PYPL', 'VZ', 'ADBE', 'NFLX', 'CMCSA', 'PFE', 'KO'],
    'india_nifty50': ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
                      'ICICIBANK.NS', 'KOTAKBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS',
                      'AXISBANK.NS', 'LT.NS', 'BAJFINANCE.NS', 'ASIANPAINT.NS', 'MARUTI.NS',
                      'HCLTECH.NS', 'WIPRO.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'NESTLEIND.NS'],
    'crypto': ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD', 'SOL-USD', 'DOGE-USD'],
}


def fetch_market_data(
    market: str = 'us_tech',
    custom_tickers: Optional[List[str]] = None,
    period: str = '1y',
    interval: str = '1d',
    include_info: bool = True
) -> List[Dict]:
    """
    High-level function to fetch market data ready for simulation.
    
    Args:
        market: Predefined market name ('us_tech', 'us_sp500_sample', 'india_nifty50', 'crypto')
        custom_tickers: Optional list of custom tickers (overrides market)
        period: Historical data period
        interval: Data interval
        include_info: Whether to fetch detailed stock info
    
    Returns:
        List of stocks in simulation format
    """
    provider = MarketDataProvider()
    
    # Determine which tickers to use
    if custom_tickers:
        tickers = custom_tickers
        logger.info(f"Using custom tickers: {tickers}")
    elif market in MARKET_TICKERS:
        tickers = MARKET_TICKERS[market]
        logger.info(f"Using predefined market '{market}' with {len(tickers)} tickers")
    else:
        logger.error(f"Unknown market '{market}'. Using default 'us_tech'")
        tickers = MARKET_TICKERS['us_tech']
    
    # Fetch market data
    market_data = provider.fetch_multiple_tickers(tickers, period, interval)
    
    # Fetch stock info if requested
    stock_info = {}
    if include_info:
        logger.info("Fetching detailed stock information...")
        for ticker in market_data.keys():
            info = provider.get_stock_info(ticker)
            if info:
                stock_info[ticker] = info
    
    # Convert to simulation format
    stocks = convert_to_simulation_format(market_data, stock_info)
    
    logger.info(f"Successfully prepared {len(stocks)} stocks for simulation")
    return stocks


# Quick test
if __name__ == "__main__":
    print("=" * 60)
    print("  🔍 Market Data Provider - Quick Test")
    print("=" * 60)
    
    # Test 1: Fetch single stock
    print("\n1. Testing single stock fetch (AAPL)...")
    provider = MarketDataProvider()
    price = provider.fetch_current_price('AAPL')
    if price:
        print(f"   ✅ Current AAPL price: ${price:.2f}")
    
    # Test 2: Fetch historical data
    print("\n2. Testing historical data (AAPL, 1 month)...")
    history = provider.fetch_historical_prices('AAPL', period='1mo', interval='1d')
    if history:
        print(f"   ✅ Fetched {len(history)} data points")
        print(f"   First: ${history[0]:.2f}, Last: ${history[-1]:.2f}")
    
    # Test 3: Fetch multiple tickers
    print("\n3. Testing multiple tickers (Tech stocks)...")
    stocks = fetch_market_data(market='us_tech', period='3mo', interval='1d')
    if stocks:
        print(f"   ✅ Fetched {len(stocks)} stocks")
        for stock in stocks[:3]:
            print(f"   - {stock['ticker']}: ${stock['current_price']:.2f} ({len(stock['history'])} historical points)")
    
    print("\n✅ All tests completed!")
