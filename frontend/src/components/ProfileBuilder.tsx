import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Save, Trash2, Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TraderResult } from '@/types/trading';
import { useCustomAgents } from '@/hooks/useCustomAgents';

interface ProfileBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (trader: Omit<TraderResult, 'rank' | 'previousRank' | 'previousPnL'>, days?: number, marketType?: string) => void;
}

const EXAMPLE_PROMPTS = [
  "I am a momentum trader. I buy stocks that are going UP and sell stocks that are going DOWN.",
  "I am a contrarian. When stocks drop more than 5%, I buy. When they rise more than 5%, I sell.",
  "I am a value investor. I only buy stocks trading below their historical average price.",
  "I am aggressive. I make large trades (50+ shares) and chase the biggest movers.",
];

export function ProfileBuilder({ isOpen, onClose, onSubmit }: ProfileBuilderProps) {
  const [name, setName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [capital, setCapital] = useState(100000);
  const [days, setDays] = useState(5);
  const [marketType, setMarketType] = useState('nifty50');
  const [dataSource, setDataSource] = useState<'csv' | 'yfinance'>('csv');
  const [yfMarket, setYfMarket] = useState('us_tech');
  const [yfPeriod, setYfPeriod] = useState('3mo');
  const [yfInterval, setYfInterval] = useState('1d');
  const [showSaved, setShowSaved] = useState(true);
  const [loadedAgentId, setLoadedAgentId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { savedAgents, addAgent, deleteAgent } = useCustomAgents();

  const handleSubmit = () => {
    if (!name.trim()) return;

    onSubmit({
      id: `user-${Date.now()}`,
      name: name.trim(),
      type: 'custom',
      currentPnL: 0,
      sharpe: 0,
      winRate: 50,
      sparklineData: [0],
      isUser: true,
      customPrompt: customPrompt.trim() || undefined,
      capital: capital,
      dataSource: dataSource,
      yfMarket: dataSource === 'yfinance' ? yfMarket : undefined,
      yfPeriod: dataSource === 'yfinance' ? yfPeriod : undefined,
      yfInterval: dataSource === 'yfinance' ? yfInterval : undefined,
    }, days, marketType);

    onClose();
    setName('');
    setCustomPrompt('');
    setCapital(100000);
    setDays(5);
    setMarketType('nifty50');
    setDataSource('csv');
    setYfMarket('us_tech');
    setYfPeriod('3mo');
    setYfInterval('1d');
    setLoadedAgentId(null);
  };

  const handleSaveAgent = () => {
    if (!name.trim()) return;
    addAgent({
      name: name.trim(),
      prompt: customPrompt.trim(),
      capital,
      dataSource,
      marketType: dataSource === 'csv' ? marketType : undefined,
      yfMarket: dataSource === 'yfinance' ? yfMarket : undefined,
      yfPeriod: dataSource === 'yfinance' ? yfPeriod : undefined,
      yfInterval: dataSource === 'yfinance' ? yfInterval : undefined,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleLoadAgent = (agent: typeof savedAgents[0]) => {
    setName(agent.name);
    setCustomPrompt(agent.prompt);
    setCapital(agent.capital);
    setDataSource(agent.dataSource);
    if (agent.marketType) setMarketType(agent.marketType);
    if (agent.yfMarket) setYfMarket(agent.yfMarket);
    if (agent.yfPeriod) setYfPeriod(agent.yfPeriod);
    if (agent.yfInterval) setYfInterval(agent.yfInterval);
    setLoadedAgentId(agent.id);
  };

  const handleDeleteAgent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteAgent(id);
    if (loadedAgentId === id) setLoadedAgentId(null);
  };

  const useExample = (prompt: string) => {
    setCustomPrompt(prompt);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-card border-l border-border z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Manifest Your AI Trader</h2>
                    <p className="text-sm text-muted-foreground">Tell your agent how to secure the bread</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* ===== SAVED AGENTS SECTION ===== */}
              {savedAgents.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowSaved(!showSaved)}
                    className="flex items-center gap-2 w-full text-left mb-3 group"
                  >
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      Saved Agents ({savedAgents.length})
                    </span>
                    {showSaved
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
                    }
                  </button>

                  <AnimatePresence>
                    {showSaved && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-1">
                          {savedAgents.map(agent => (
                            <motion.div
                              key={agent.id}
                              onClick={() => handleLoadAgent(agent)}
                              className={`
                                group relative p-3 rounded-xl cursor-pointer transition-all duration-200
                                border
                                ${loadedAgentId === agent.id
                                  ? 'border-primary/60 bg-primary/10 shadow-[0_0_15px_hsl(270,60%,50%,0.1)]'
                                  : 'border-border/50 bg-secondary/50 hover:border-primary/30 hover:bg-secondary/80'
                                }
                              `}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold truncate">{agent.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium shrink-0">
                                      {agent.dataSource === 'yfinance' ? '🌐 Live' : '📊 CSV'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {agent.prompt || 'Default momentum strategy'}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                                    ₹{agent.capital.toLocaleString()} · Saved {new Date(agent.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteAgent(e, agent.id)}
                                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all"
                                  title="Delete agent"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {loadedAgentId === agent.id && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                                >
                                  <span className="text-[10px] text-primary-foreground">✓</span>
                                </motion.div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Form */}
              <div className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Trader Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., My Quant Bot"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary border-border"
                  />
                </div>

                {/* Starting Capital */}
                <div className="space-y-2">
                  <Label htmlFor="capital">Starting Capital (₹)</Label>
                  <Input
                    id="capital"
                    type="number"
                    min={1000}
                    max={10000000}
                    step={1000}
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    How much money your AI starts with (min ₹1,000)
                  </p>
                </div>

                {/* Market Selection */}
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <select
                    id="dataSource"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value as 'csv' | 'yfinance')}
                    className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                  >
                    <option value="csv">📊 Simulated Data (CSV)</option>
                    <option value="yfinance">🌐 Live Data (yfinance)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {dataSource === 'csv'
                      ? 'Use pre-loaded Indian market data'
                      : '✨ Fetch real-time data from Yahoo Finance'}
                  </p>
                </div>

                {/* CSV Market Selection */}
                {dataSource === 'csv' && (
                  <div className="space-y-2">
                    <Label htmlFor="market">Choose Market</Label>
                    <select
                      id="market"
                      value={marketType}
                      onChange={(e) => setMarketType(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                    >
                      <option value="nifty50">NIFTY 50 (50 stocks - all sectors)</option>
                      <option value="banknifty">Bank NIFTY (12 stocks - banking only)</option>
                      <option value="sensex">SENSEX (30 stocks - BSE benchmark)</option>
                      <option value="finnifty">Fin NIFTY (20 stocks - financial sector)</option>
                      <option value="bankex">BANKEX (12 stocks - banking sector)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Select which Indian market index to trade in
                    </p>
                  </div>
                )}

                {/* Live Data Market Selection */}
                {dataSource === 'yfinance' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="yfMarket">Live Market</Label>
                      <select
                        id="yfMarket"
                        value={yfMarket}
                        onChange={(e) => setYfMarket(e.target.value)}
                        className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                      >
                        <option value="us_tech">🇺🇸 US Tech Giants (AAPL, MSFT, GOOGL...)</option>
                        <option value="us_sp500_sample">🇺🇸 S&P 500 Sample (20 stocks)</option>
                        <option value="india_nifty50">🇮🇳 India NIFTY 50 (20 stocks)</option>
                        <option value="crypto">₿ Cryptocurrencies (BTC, ETH...)</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Select which global market to trade
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="yfPeriod">Historical Period</Label>
                        <select
                          id="yfPeriod"
                          value={yfPeriod}
                          onChange={(e) => setYfPeriod(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                        >
                          <option value="1mo">1 Month</option>
                          <option value="3mo">3 Months</option>
                          <option value="6mo">6 Months</option>
                          <option value="1y">1 Year</option>
                          <option value="2y">2 Years</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="yfInterval">Data Interval</Label>
                        <select
                          id="yfInterval"
                          value={yfInterval}
                          onChange={(e) => setYfInterval(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm"
                        >
                          <option value="1d">Daily</option>
                          <option value="1wk">Weekly</option>
                          <option value="1mo">Monthly</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-primary font-medium">
                        🌐 Live Data Mode: Fetching real market data from Yahoo Finance
                      </p>
                    </div>
                  </>
                )}

                {/* Simulation Days */}
                <div className="space-y-2">
                  <Label htmlFor="days">Simulation Days</Label>
                  <Input
                    id="days"
                    type="number"
                    min={3}
                    max={50}
                    step={1}
                    value={days}
                    onChange={(e) => setDays(Math.max(3, Math.min(50, Number(e.target.value))))}
                    className="bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many trading days to simulate (3-50)
                  </p>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">
                    System Prompt <span className="text-muted-foreground text-xs">(Optional - uses default if empty)</span>
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="Leave empty to use default momentum rotation strategy, or write your own..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="bg-secondary border-border min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for default strategy, or customize your trading rules.
                  </p>
                </div>

                {/* Example Prompts */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Quick Examples</Label>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => useExample(prompt)}
                        className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {prompt.split('.')[0].replace('I am ', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {customPrompt && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-1">Your Strategy</p>
                    <p className="text-sm text-foreground line-clamp-3">{customPrompt}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Save Agent Button */}
                  <Button
                    onClick={handleSaveAgent}
                    disabled={!name.trim()}
                    variant="outline"
                    className={`h-12 px-4 transition-all ${saveSuccess ? 'border-green-500/50 text-green-400' : ''}`}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveSuccess ? 'Saved!' : 'Save Agent'}
                  </Button>

                  {/* Submit */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!name.trim()}
                    className="flex-1 h-12 text-base font-semibold"
                    size="lg"
                  >
                    <Rocket className="mr-2 h-5 w-5" />
                    Start Trading
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
