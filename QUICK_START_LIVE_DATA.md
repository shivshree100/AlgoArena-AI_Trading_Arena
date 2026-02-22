# Quick Start: Live Data Integration

Get started with live stock data in 5 minutes!

## 🚀 Installation

```bash
pip install yfinance pandas
```

## 📝 Basic Usage

### 1. Fetch Live Data (Python)

```python
from market_data import fetch_market_data

# Fetch US tech stocks
stocks = fetch_market_data(
    market='us_tech',
    period='3mo',
    interval='1d'
)

# Print results
for stock in stocks:
    print(f"{stock['ticker']}: ${stock['current_price']:.2f}")
```

### 2. Use in WebSocket (Frontend)

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws');

// Start simulation with live data
ws.send(JSON.stringify({
  command: "start_simulation",
  num_ticks: 10,
  tick_delay: 1.0,
  data_source: "yfinance",     // Use live data
  yf_market: "us_tech",         // Market to use
  yf_period: "3mo",             // 3 months of history
  yf_interval: "1d"             // Daily data
}));
```

### 3. Use CSV Data (Default)

```javascript
// Use simulated CSV data instead
ws.send(JSON.stringify({
  command: "start_simulation",
  num_ticks: 10,
  tick_delay: 1.0,
  data_source: "csv",           // Use CSV data
  market_type: "nifty50"        // Indian market
}));
```

## 🎯 Quick Examples

### Example 1: US Tech Stocks

```python
from market_data import fetch_market_data

stocks = fetch_market_data(market='us_tech', period='1y', interval='1wk')
# Returns: AAPL, MSFT, GOOGL, AMZN, META, NVDA, TSLA, NFLX, AMD, INTC
```

### Example 2: Custom Tickers

```python
stocks = fetch_market_data(
    custom_tickers=['TSLA', 'NVDA', 'AMD'],
    period='6mo',
    interval='1d'
)
```

### Example 3: Indian Stocks

```python
stocks = fetch_market_data(market='india_nifty50', period='1y', interval='1d')
# Returns: RELIANCE.NS, TCS.NS, HDFCBANK.NS, etc.
```

### Example 4: Cryptocurrencies

```python
stocks = fetch_market_data(market='crypto', period='1mo', interval='1d')
# Returns: BTC-USD, ETH-USD, BNB-USD, etc.
```

## 🔧 Configuration

### Available Markets

| Market | Description | Tickers |
|--------|-------------|---------|
| `us_tech` | US Tech Giants | 10 stocks |
| `us_sp500_sample` | S&P 500 Sample | 20 stocks |
| `india_nifty50` | Indian NIFTY 50 | 20 stocks |
| `crypto` | Cryptocurrencies | 7 coins |

### Period Options

- `1mo`, `3mo`, `6mo` - Months
- `1y`, `2y`, `5y` - Years
- `ytd` - Year to date
- `max` - All available

### Interval Options

- `1d` - Daily (recommended)
- `1wk` - Weekly
- `1mo` - Monthly
- `1h` - Hourly (limited)

## 🧪 Testing

```bash
# Test live data fetching
python test_live_data.py

# Run example simulation
python example_live_simulation.py
```

## 📊 API Endpoints

### Get Available Markets

```bash
curl http://localhost:8000/api/markets/available
```

### Preview Market Data

```bash
curl -X POST http://localhost:8000/api/markets/preview \
  -H "Content-Type: application/json" \
  -d '{
    "market": "us_tech",
    "period": "3mo",
    "interval": "1d"
  }'
```

### Get Ticker Info

```bash
curl http://localhost:8000/api/markets/ticker/AAPL
```

## 💡 Tips

1. **Start with predefined markets** - Use `us_tech` or `india_nifty50` first
2. **Use daily intervals** - More reliable than minute data
3. **3-6 months is optimal** - Good balance of data and performance
4. **Check ticker format** - US: `AAPL`, India: `RELIANCE.NS`, Crypto: `BTC-USD`
5. **Test first** - Run `test_live_data.py` before using in production

## 🐛 Common Issues

### Issue: "No data available"
**Fix**: Check ticker symbol format and internet connection

### Issue: "Rate limit exceeded"
**Fix**: Add delays between requests or reduce ticker count

### Issue: "Ticker not found"
**Fix**: Verify ticker exists on Yahoo Finance

## 📚 Full Documentation

See [LIVE_DATA_GUIDE.md](LIVE_DATA_GUIDE.md) for complete documentation.

## 🎮 Next Steps

1. ✅ Install dependencies: `pip install -r requirements.txt`
2. ✅ Test: `python test_live_data.py`
3. ✅ Try example: `python example_live_simulation.py`
4. ✅ Integrate with your frontend
5. ✅ Build custom strategies!

Happy Trading! 🚀
