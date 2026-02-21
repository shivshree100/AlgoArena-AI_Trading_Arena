import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TraderResult } from '@/types/trading';

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
      customPrompt: customPrompt.trim() || undefined, // Empty string becomes undefined
      capital: capital,
    }, days, marketType);

    onClose();
    setName('');
    setCustomPrompt('');
    setCapital(100000);
    setDays(5);
    setMarketType('nifty50');
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

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={!name.trim()}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  <Rocket className="mr-2 h-5 w-5" />
                  Start Trading
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
