# Architecture: Live Data Integration

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User Interface (React)                                   │  │
│  │  - Market selection dropdown                              │  │
│  │  - Data source toggle (CSV / Live)                        │  │
│  │  - Period/Interval selectors                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (server.py)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebSocket Handler                                        │  │
│  │  - Receives simulation commands                           │  │
│  │  - Parses data_source parameter                           │  │
│  │  - Routes to appropriate data loader                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                  │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │  load_stocks()      │       │ load_stocks_from_   │         │
│  │  (CSV Data)         │       │ yfinance()          │         │
│  │  - Static files     │       │ (Live Data)         │         │
│  │  - 12 months        │       │ - API calls         │         │
│  │  - Indian markets   │       │ - Flexible periods  │         │
│  └─────────────────────┘       └─────────────────────┘         │
│              │                               │                   │
│              └───────────────┬───────────────┘                  │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  run_simulation_streaming()                               │  │
│  │  - Creates orchestrator                                   │  │
│  │  - Initializes agents                                     │  │
│  │  - Runs simulation ticks                                  │  │
│  │  - Broadcasts results                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (if data_source = "yfinance")
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MARKET DATA MODULE (market_data.py)             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MarketDataProvider                                       │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  fetch_current_price()                             │  │  │
│  │  │  fetch_historical_prices()                         │  │  │
│  │  │  fetch_multiple_tickers()                          │  │  │
│  │  │  get_stock_info()                                  │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              │ API Calls                         │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  yfinance Library                                         │  │
│  │  - Ticker.history()                                       │  │
│  │  - Ticker.info                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS Requests
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    YAHOO FINANCE API                             │
│  - Real-time stock prices                                        │
│  - Historical OHLCV data                                         │
│  - Stock information (sector, market cap, etc.)                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Flow 1: CSV Data (Original)

```
User → WebSocket → server.py → load_stocks() → CSV Files
                                      ↓
                              Stock Data (12 months)
                                      ↓
                          run_simulation_streaming()
                                      ↓
                              Simulation Results
                                      ↓
                              WebSocket → User
```

### Flow 2: Live Data (New)

```
User → WebSocket → server.py → load_stocks_from_yfinance()
                                      ↓
                              market_data.py
                                      ↓
                              MarketDataProvider
                                      ↓
                              yfinance Library
                                      ↓
                              Yahoo Finance API
                                      ↓
                              Stock Data (flexible period)
                                      ↓
                          run_simulation_streaming()
                                      ↓
                              Simulation Results
                                      ↓
                              WebSocket → User
```

## Component Responsibilities

### 1. Frontend
- **Responsibility**: User interface and data source selection
- **Inputs**: User interactions
- **Outputs**: WebSocket commands with parameters
- **Key Files**: `frontend/src/`

### 2. Server (server.py)
- **Responsibility**: Request routing and simulation orchestration
- **Inputs**: WebSocket commands, REST requests
- **Outputs**: Simulation data, market data
- **Key Functions**:
  - `websocket_endpoint()` - Handle WebSocket connections
  - `run_simulation_streaming()` - Run simulation
  - `load_stocks()` - Load CSV data
  - `load_stocks_from_yfinance()` - Load live data

### 3. Market Data Module (market_data.py)
- **Responsibility**: Fetch and format market data
- **Inputs**: Market type, tickers, period, interval
- **Outputs**: Formatted stock data
- **Key Classes**:
  - `MarketDataProvider` - Core data fetching
- **Key Functions**:
  - `fetch_market_data()` - High-level data fetching
  - `convert_to_simulation_format()` - Format conversion

### 4. yfinance Library
- **Responsibility**: Interface with Yahoo Finance API
- **Inputs**: Ticker symbols, periods, intervals
- **Outputs**: Raw market data
- **External Dependency**: Maintained by community

### 5. Yahoo Finance API
- **Responsibility**: Provide market data
- **Inputs**: HTTP requests
- **Outputs**: JSON/CSV market data
- **External Service**: Yahoo Finance

## API Endpoints

### WebSocket Endpoint

```
ws://localhost:8000/ws

Commands:
  - start_simulation
    Parameters:
      - num_ticks: int
      - tick_delay: float
      - data_source: "csv" | "yfinance"
      - market_type: string (for CSV)
      - yf_market: string (for yfinance)
      - yf_tickers: string[] (optional)
      - yf_period: string
      - yf_interval: string
```

### REST Endpoints

```
GET  /api/markets/available
     Returns: List of predefined markets

POST /api/markets/preview
     Body: {market, period, interval}
     Returns: Market data preview

GET  /api/markets/ticker/{ticker}
     Returns: Ticker information

POST /api/backtest
     Body: {strategy, market_type, tickers, initial_capital}
     Returns: Backtest results

GET  /api/backtest/strategies
     Returns: Available strategies
```

## Data Format

### Stock Data Structure

```python
{
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "history": [245.2, 247.8, 250.1, ...],  # Historical prices
    "current_price": 264.58
}
```

### WebSocket Message Format

```javascript
// Command (Client → Server)
{
    "command": "start_simulation",
    "num_ticks": 10,
    "data_source": "yfinance",
    "yf_market": "us_tech",
    "yf_period": "3mo",
    "yf_interval": "1d"
}

// Response (Server → Client)
{
    "type": "simulation_starting",
    "num_ticks": 10,
    "data_source": "yfinance",
    "market": "us_tech"
}

// Market Update (Server → Client)
{
    "price": 102.5,
    "tick": 3,
    "portfolios": {...},
    "top_gainers": [...],
    "top_losers": [...]
}
```

## Configuration

### Predefined Markets

```python
MARKET_TICKERS = {
    'us_tech': ['AAPL', 'MSFT', 'GOOGL', ...],
    'us_sp500_sample': ['AAPL', 'MSFT', ...],
    'india_nifty50': ['RELIANCE.NS', 'TCS.NS', ...],
    'crypto': ['BTC-USD', 'ETH-USD', ...]
}
```

### Period Options

```
Short-term:  1d, 5d, 1mo
Medium-term: 3mo, 6mo
Long-term:   1y, 2y, 5y, 10y
Special:     ytd, max
```

### Interval Options

```
Intraday:  1m, 5m, 15m, 30m, 1h
Daily:     1d
Weekly:    1wk
Monthly:   1mo, 3mo
```

## Error Handling

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validation     │
│  - Check params │
│  - Verify format│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Fetch     │
│  - Try yfinance │
│  - Catch errors │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Success?│
    └────┬────┘
         │
    ┌────┴────┐
    │   Yes   │   No
    ▼         ▼
┌────────┐ ┌────────┐
│ Return │ │Fallback│
│  Data  │ │to CSV  │
└────────┘ └────────┘
```

## Performance Considerations

### Caching Strategy

```
Request → Check Cache → Cache Hit? → Return Cached Data
                            │
                            No
                            ↓
                    Fetch from API
                            ↓
                    Store in Cache
                            ↓
                    Return Fresh Data
```

### Rate Limiting

```
Request Counter → Check Limit → Under Limit? → Process Request
                                      │
                                      No
                                      ↓
                              Return Error / Wait
```

## Security

### API Key Management

```
Environment Variables → Load at Startup → Use in Requests
                                              │
                                              ▼
                                    Never expose to client
```

### Input Validation

```
User Input → Sanitize → Validate → Process
                            │
                         Invalid
                            ↓
                      Return Error
```

## Testing Strategy

```
Unit Tests → Integration Tests → End-to-End Tests
    │              │                    │
    ▼              ▼                    ▼
Individual    Module           Full System
Functions     Interaction      Workflow
```

---

This architecture provides:
- ✅ Flexibility (CSV or Live data)
- ✅ Scalability (Easy to add new markets)
- ✅ Maintainability (Clear separation of concerns)
- ✅ Reliability (Error handling and fallbacks)
- ✅ Performance (Caching and optimization)
