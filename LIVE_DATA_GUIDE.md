# Live Data Integration Guide

This guide explains how to use real-time and historical stock data from yfinance in AlgoArena.

## 🌟 Features

- **Live Stock Prices**: Fetch current prices from Yahoo Finance
- **Historical Data**: Access years of historical price data
- **Multiple Markets**: Support for US stocks, Indian stocks, and cryptocurrencies
- **Flexible Periods**: Choose from 1 month to 10 years of data
- **Custom Tickers**: Use any ticker symbols supported by Yahoo Finance

## 📦 Installation

The required packages are already in `requirements.txt`:

```bash
pip install -r requirements.txt
```

## 🚀 Quick Start

### 1. Test Live Data Fetching

Run the test script to verify everything works:

```bash
python test_live_data.py
```

This will fetch data from various markets and display the results.

### 2. Using Live Data in Simulation

#### Via WebSocket (Frontend)

Send a WebSocket message with `data_source: "yfinance"`:

```javascript
{
  "command": "start_simulation",
  "num_ticks": 10,
  "tick_delay": 1.0,
  "data_source": "yfinance",
  "yf_market": "us_tech",
  "yf_period": "3mo",
  "yf_interval": "1d"
}
```

#### Via Python API

```python
from market_data import fetch_market_data

# Fetch US tech stocks
stocks = fetch_market_data(
    market='us_tech',
    period='3mo',
    interval='1d'
)

# Use in simulation
for stock in stocks:
    print(f"{stock['ticker']}: ${stock['current_price']:.2f}")
```

## 📊 Available Markets

### Predefined Markets

1. **us_tech** - US Tech Giants
   - AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, NFLX, AMD, INTC

2. **us_sp500_sample** - S&P 500 Sample (20 stocks)
   - AAPL, MSFT, GOOGL, AMZN, BRK-B, JNJ, V, PG, JPM, UNH, etc.

3. **india_nifty50** - Indian NIFTY 50 Sample
   - RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, HINDUNILVR.NS, etc.

4. **crypto** - Cryptocurrencies
   - BTC-USD, ETH-USD, BNB-USD, XRP-USD, ADA-USD, SOL-USD, DOGE-USD

### Custom Tickers

You can also use any custom list of tickers:

```python
stocks = fetch_market_data(
    custom_tickers=['TSLA', 'NVDA', 'AMD', 'PLTR'],
    period='1y',
    interval='1wk'
)
```

## ⚙️ Configuration Options

### Period Options

- `1d`, `5d` - Days
- `1mo`, `3mo`, `6mo` - Months
- `1y`, `2y`, `5y`, `10y` - Years
- `ytd` - Year to date
- `max` - All available data

### Interval Options

- `1m`, `2m`, `5m`, `15m`, `30m`, `60m`, `90m` - Minutes (limited to last 7 days)
- `1h` - Hourly
- `1d` - Daily
- `5d` - 5 days
- `1wk` - Weekly
- `1mo`, `3mo` - Monthly

## 🔌 API Endpoints

### 1. Get Available Markets

```http
GET /api/markets/available
```

Returns list of predefined markets and their details.

### 2. Preview Market Data

```http
POST /api/markets/preview
Content-Type: application/json

{
  "market": "us_tech",
  "period": "3mo",
  "interval": "1d"
}
```

Preview data without starting simulation.

### 3. Get Ticker Info

```http
GET /api/markets/ticker/AAPL
```

Get detailed information about a specific ticker.

## 💻 Code Examples

### Example 1: Fetch Single Stock

```python
from market_data import MarketDataProvider

provider = MarketDataProvider()

# Get current price
price = provider.fetch_current_price('AAPL')
print(f"AAPL: ${price:.2f}")

# Get historical data
history = provider.fetch_historical_prices('AAPL', period='1y', interval='1d')
print(f"Data points: {len(history)}")
```

### Example 2: Fetch Multiple Stocks

```python
from market_data import fetch_market_data

# Fetch US tech stocks with 6 months of daily data
stocks = fetch_market_data(
    market='us_tech',
    period='6mo',
    interval='1d',
    include_info=True
)

for stock in stocks:
    print(f"{stock['ticker']}: {stock['name']}")
    print(f"  Price: ${stock['current_price']:.2f}")
    print(f"  Sector: {stock['sector']}")
    print(f"  History: {len(stock['history'])} points")
```

### Example 3: Indian Stocks

```python
# Fetch Indian NIFTY 50 stocks
stocks = fetch_market_data(
    market='india_nifty50',
    period='1y',
    interval='1wk'
)

# Note: Indian tickers need .NS suffix (e.g., RELIANCE.NS)
```

### Example 4: Cryptocurrencies

```python
# Fetch crypto data
stocks = fetch_market_data(
    market='crypto',
    period='1mo',
    interval='1d'
)

# Crypto tickers use -USD suffix (e.g., BTC-USD)
```

## 🎮 Using in Simulation

### WebSocket Parameters

When starting a simulation via WebSocket, use these parameters:

```javascript
{
  "command": "start_simulation",
  "num_ticks": 10,              // Number of simulation ticks
  "tick_delay": 1.0,            // Delay between ticks (seconds)
  "data_source": "yfinance",    // Use "csv" for simulated data
  "yf_market": "us_tech",       // Predefined market
  "yf_tickers": null,           // Or custom ticker list
  "yf_period": "3mo",           // Historical period
  "yf_interval": "1d",          // Data interval
  "custom_agent": {             // Optional custom agent
    "name": "My Bot",
    "prompt": "Trading strategy...",
    "capital": 100000
  }
}
```

### Comparison: CSV vs Live Data

| Feature | CSV Data | Live Data (yfinance) |
|---------|----------|---------------------|
| Data Source | Static CSV files | Yahoo Finance API |
| Update Frequency | Manual | Real-time |
| Historical Range | 12 months | Up to 10+ years |
| Markets | Indian indices | Global markets |
| Customization | Limited | Fully customizable |
| Internet Required | No | Yes |

## 🛠️ Troubleshooting

### Issue: No data returned

**Solution**: Check ticker symbol format
- US stocks: `AAPL`, `MSFT`
- Indian stocks: `RELIANCE.NS`, `TCS.NS`
- Crypto: `BTC-USD`, `ETH-USD`

### Issue: Limited historical data

**Solution**: Some tickers have limited history. Try:
- Reducing the period (e.g., `3mo` instead of `5y`)
- Using daily interval instead of minute intervals

### Issue: Rate limiting

**Solution**: Yahoo Finance may rate limit requests. If you get errors:
- Add delays between requests
- Reduce the number of tickers
- Use cached data when possible

## 📝 Notes

1. **Data Quality**: yfinance data is provided by Yahoo Finance and may have occasional gaps or delays
2. **Rate Limits**: Be mindful of API rate limits when fetching large amounts of data
3. **Ticker Symbols**: Use correct ticker format for each market (e.g., .NS for India, -USD for crypto)
4. **Internet Required**: Live data requires active internet connection
5. **Fallback**: System automatically falls back to CSV data if yfinance fails

## 🔗 Resources

- [yfinance Documentation](https://pypi.org/project/yfinance/)
- [Yahoo Finance](https://finance.yahoo.com/)
- [Ticker Symbol Search](https://finance.yahoo.com/lookup)

## 🎯 Next Steps

1. Run `python test_live_data.py` to verify setup
2. Try different markets and periods
3. Integrate with your trading strategies
4. Experiment with custom ticker lists
5. Build your own market analysis tools

Happy Trading! 🚀📈
