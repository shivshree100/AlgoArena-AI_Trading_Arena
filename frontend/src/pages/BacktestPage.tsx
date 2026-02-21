// ============================================
// SmartAlgo - Strategy Backtesting Page
// Deterministic strategy evaluation with
// equity curve, benchmark, metrics & trades
// ============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, TrendingUp, TrendingDown, Activity,
  BarChart3, Target, Percent, Shield, Zap, Trophy, Clock,
  ChevronDown, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, LineChart, Line
} from 'recharts';

// ============================================
// Types
// ============================================

interface BacktestMetrics {
  total_return: number;
  annualized_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  volatility: number;
  win_rate: number;
  total_trades: number;
  benchmark_return: number;
  alpha: number;
}

interface BacktestTrade {
  tick: number;
  ticker: string;
  action: string;
  price: number;
  shares: number;
  value: number;
  portfolio_value: number;
}

interface BacktestResult {
  equity_curve: { tick: number; value: number }[];
  benchmark_curve: { tick: number; value: number }[];
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  config: {
    strategy: string;
    market_type: string;
    tickers: string[];
    initial_capital: number;
    position_size: number;
    num_ticks: number;
  };
}

// ============================================
// Constants
// ============================================

const STRATEGIES = [
  { id: 'momentum', label: 'Momentum', icon: TrendingUp, desc: 'Ride upward trends, cut losers' },
  { id: 'contrarian', label: 'Contrarian', icon: TrendingDown, desc: 'Buy dips, sell rallies' },
  { id: 'value_hunter', label: 'Value Hunter', icon: Target, desc: 'Buy undervalued, sell overvalued' },
  { id: 'sector_rotator', label: 'Sector Rotator', icon: BarChart3, desc: 'Rotate into strongest sectors' },
  { id: 'yolo', label: 'YOLO', icon: Zap, desc: 'Aggressive big-mover plays' },
];

const MARKETS = [
  { id: 'nifty50', label: 'NIFTY 50' },
  { id: 'banknifty', label: 'Bank NIFTY' },
  { id: 'sensex', label: 'SENSEX' },
  { id: 'finnifty', label: 'Fin NIFTY' },
  { id: 'bankex', label: 'BANKEX' },
];

// ============================================
// Metric Card Component
// ============================================

function MetricCard({
  label,
  value,
  suffix = '',
  icon: Icon,
  color,
  delay = 0,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  color: 'gain' | 'loss' | 'accent' | 'neutral';
  delay?: number;
}) {
  const colorMap = {
    gain: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    loss: 'text-red-400 bg-red-500/10 border-red-500/20',
    accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    neutral: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };
  const iconBg = {
    gain: 'bg-emerald-500/20',
    loss: 'bg-red-500/20',
    accent: 'bg-violet-500/20',
    neutral: 'bg-sky-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`rounded-2xl border p-5 flex flex-col gap-3 backdrop-blur-md ${colorMap[color]}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">
        {typeof value === 'number' ? (value >= 0 ? '+' : '') : ''}
        {typeof value === 'number' ? value.toFixed(2) : value}
        {suffix && <span className="text-sm opacity-60 ml-1">{suffix}</span>}
      </div>
    </motion.div>
  );
}

// ============================================
// Custom Tooltip
// ============================================

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[hsl(265,25%,12%)]/95 backdrop-blur-md px-4 py-3 shadow-2xl">
      <p className="text-xs text-muted-foreground mb-2">Month {label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: ₹{Number(entry.value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
      ))}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function BacktestPage() {
  const navigate = useNavigate();

  const [strategy, setStrategy] = useState('momentum');
  const [market, setMarket] = useState('nifty50');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, market_type: market }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  // Merge equity + benchmark curves for chart
  const chartData = result
    ? result.equity_curve.map((pt, i) => ({
        tick: pt.tick,
        Strategy: pt.value,
        Benchmark: result.benchmark_curve[i]?.value ?? pt.value,
      }))
    : [];

  const selectedStrat = STRATEGIES.find((s) => s.id === strategy);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="gradient-header sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-400" />
                Strategy Backtester
              </h1>
              <p className="text-xs text-muted-foreground">Deterministic evaluation on historical data</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-8 lg:px-10 py-6 md:py-8 flex-1">
        {/* ===== Configuration Panel ===== */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/[0.06] bg-[hsl(265,20%,11%)]/80 backdrop-blur-lg p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" /> Configure Backtest
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Strategy Selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Strategy
              </label>
              <div className="space-y-2">
                {STRATEGIES.map((s) => {
                  const Icon = s.icon;
                  const isActive = strategy === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStrategy(s.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                        isActive
                          ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs opacity-60">{s.desc}</div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Market Selector */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                Market Index
              </label>
              <div className="space-y-2">
                {MARKETS.map((m) => {
                  const isActive = market === m.id;
                  return (
                    <motion.button
                      key={m.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setMarket(m.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        isActive
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] text-muted-foreground'
                      }`}
                    >
                      <div className="text-sm font-medium">{m.label}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Run Button + Summary */}
            <div className="flex flex-col justify-between">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                <h3 className="text-sm font-semibold mb-2">Backtest Summary</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Strategy: <span className="text-foreground font-medium">{selectedStrat?.label}</span></p>
                  <p>Market: <span className="text-foreground font-medium">{MARKETS.find(m => m.id === market)?.label}</span></p>
                  <p>Initial Capital: <span className="text-foreground font-medium">₹1,00,000</span></p>
                  <p>Position Size: <span className="text-foreground font-medium">10 shares/trade</span></p>
                  <p>Data: <span className="text-foreground font-medium">12-month historical</span></p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={runBacktest}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: loading
                    ? 'hsl(265, 20%, 20%)'
                    : 'linear-gradient(135deg, hsl(270, 80%, 55%) 0%, hsl(290, 70%, 50%) 100%)',
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 20px hsl(270, 80%, 55%, 0.3)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Run Backtest
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 mb-6 text-red-400 text-sm"
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Results ===== */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Metric Cards */}
              <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                <MetricCard
                  label="Total Return"
                  value={result.metrics.total_return}
                  suffix="%"
                  icon={TrendingUp}
                  color={result.metrics.total_return >= 0 ? 'gain' : 'loss'}
                  delay={0}
                />
                <MetricCard
                  label="Benchmark Return"
                  value={result.metrics.benchmark_return}
                  suffix="%"
                  icon={BarChart3}
                  color={result.metrics.benchmark_return >= 0 ? 'gain' : 'loss'}
                  delay={0.05}
                />
                <MetricCard
                  label="Alpha"
                  value={result.metrics.alpha}
                  suffix="%"
                  icon={Trophy}
                  color={result.metrics.alpha >= 0 ? 'gain' : 'loss'}
                  delay={0.1}
                />
                <MetricCard
                  label="Sharpe Ratio"
                  value={result.metrics.sharpe_ratio}
                  icon={Activity}
                  color={result.metrics.sharpe_ratio >= 1 ? 'gain' : result.metrics.sharpe_ratio >= 0 ? 'neutral' : 'loss'}
                  delay={0.15}
                />
                <MetricCard
                  label="Max Drawdown"
                  value={-result.metrics.max_drawdown}
                  suffix="%"
                  icon={TrendingDown}
                  color={result.metrics.max_drawdown <= 5 ? 'gain' : result.metrics.max_drawdown <= 15 ? 'neutral' : 'loss'}
                  delay={0.2}
                />
                <MetricCard
                  label="Volatility"
                  value={result.metrics.volatility}
                  suffix="%"
                  icon={Percent}
                  color="neutral"
                  delay={0.25}
                />
                <MetricCard
                  label="Win Rate"
                  value={result.metrics.win_rate}
                  suffix="%"
                  icon={Target}
                  color={result.metrics.win_rate >= 50 ? 'gain' : 'loss'}
                  delay={0.3}
                />
                <MetricCard
                  label="Total Trades"
                  value={result.metrics.total_trades}
                  icon={Clock}
                  color="accent"
                  delay={0.35}
                />
              </section>

              {/* Equity Curve Chart */}
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-white/[0.06] bg-[hsl(265,20%,11%)]/80 backdrop-blur-lg p-6 mb-8"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" /> Equity Curve vs Benchmark
                </h2>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(270, 80%, 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(200, 70%, 55%)" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(200, 70%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="tick"
                        stroke="rgba(255,255,255,0.15)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        tickFormatter={(v) => `M${v}`}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.15)"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        width={60}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: 10, fontSize: 12, opacity: 0.7 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Strategy"
                        stroke="hsl(270, 80%, 60%)"
                        strokeWidth={2.5}
                        fill="url(#colorStrategy)"
                        dot={false}
                        activeDot={{ r: 4, fill: 'hsl(270, 80%, 60%)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="Benchmark"
                        stroke="hsl(200, 70%, 55%)"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        fill="url(#colorBenchmark)"
                        dot={false}
                        activeDot={{ r: 3, fill: 'hsl(200, 70%, 55%)' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>

              {/* Trade History */}
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-white/[0.06] bg-[hsl(265,20%,11%)]/80 backdrop-blur-lg p-6"
              >
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-400" /> Trade History
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    ({result.trades.length} trades)
                  </span>
                </h2>

                {result.trades.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No trades were executed. The strategy held through all ticks.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="border-b border-white/[0.06] bg-[hsl(265,20%,11%)]">
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                          <th className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ticker</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shares</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
                          <th className="text-right py-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portfolio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((trade, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.01 * i }}
                            className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-2.5 px-3 text-muted-foreground">M{trade.tick}</td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                                  trade.action === 'BUY'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-red-500/15 text-red-400'
                                }`}
                              >
                                {trade.action === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {trade.action}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-medium">{trade.ticker}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">₹{trade.price.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right">{trade.shares}</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">₹{trade.value.toLocaleString('en-IN')}</td>
                            <td className="py-2.5 px-3 text-right font-medium">₹{trade.portfolio_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
