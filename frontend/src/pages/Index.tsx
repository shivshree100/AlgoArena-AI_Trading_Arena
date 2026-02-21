// ============================================
// SmartAlgo - Main Dashboard Page
// Market-level abstraction with Index + Sectors
// ============================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';
import { Header } from '@/components/Header';
import { InstrumentChart } from '@/components/InstrumentChart';
import { MarketBoard } from '@/components/MarketBoard';
import { CompactAgentFeed } from '@/components/CompactAgentFeed';
import { AgentStatusBoard } from '@/components/AgentStatusBoard';
import { SimulationControls } from '@/components/SimulationControls';
import { TraderFooter } from '@/components/TraderFooter';
import { ProfileBuilder } from '@/components/ProfileBuilder';
import { PerformanceCelebration } from '@/components/PerformanceCelebration';
import { SessionEndBanner } from '@/components/SessionEndBanner';
import { PostMarketAnalysis } from '@/components/PostMarketAnalysis';
import { TradingConsultant } from '@/components/TradingConsultant';
import { DashboardSparkles } from '@/components/DashboardSparkles';
import { TraderResult } from '@/types/trading';
import { useMarketStore } from '@/store/marketStore';
import { useSimulationControls } from '@/store/MarketProvider';

interface IndexProps {
  onLogout?: () => void;
}

const Index = ({ onLogout }: IndexProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userTrader, setUserTrader] = useState<TraderResult | undefined>();

  const { state, dispatch } = useMarketStore();
  const { isConnected, isSimulationStarted, startSimulation } = useSimulationControls();
  // Session is complete when we receive simulation_complete from backend
  const isSessionComplete = state.simulationResults !== undefined;

  // Auto-pause when session is complete
  useEffect(() => {
    if (isSessionComplete && state.simStatus.running) {
      dispatch({ type: 'SIM_TOGGLE_PLAY' });
    }
  }, [isSessionComplete, state.simStatus.running, dispatch]);

  const handleJumpIn = () => {
    setIsProfileOpen(true);
  };

  const handleAdjust = () => {
    setIsProfileOpen(true);
  };

  const handleViewAnalysis = () => {
    setIsAnalysisOpen(true);
  };

  const handleRestart = () => {
    dispatch({ type: 'SIM_RESET' });
    setIsAnalysisOpen(false);
  };

  const handleProfileSubmit = (trader: Omit<TraderResult, 'rank' | 'previousRank' | 'currentPnL' | 'previousPnL'>, days?: number, marketType?: string) => {
    // Create the full trader result with initial values
    const fullTrader: TraderResult = {
      ...trader,
      rank: 5,
      previousRank: 5,
      currentPnL: 0,
      previousPnL: 0,
    };
    setUserTrader(fullTrader);
    setIsProfileOpen(false);

    // Start simulation with custom agent config
    // If prompt is empty or undefined, backend will use default strategy
    startSimulation({
      name: trader.name,
      prompt: trader.customPrompt || '', // Empty string triggers default in backend
      capital: trader.capital || 100000,
      numTicks: days || 5,
      marketType: marketType || 'nifty50',
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <DashboardSparkles />
      <Header onLogout={onLogout} />

      {/* Performance celebration toast */}
      <PerformanceCelebration userTrader={userTrader} />

      <main className="container px-4 md:px-8 lg:px-10 py-6 md:py-8 flex-1 relative z-10">
        {/* Session End Banner */}
        {isSessionComplete && (
          <div className="mb-6">
            <SessionEndBanner onViewAnalysis={handleViewAnalysis} />
          </div>
        )}

        {/* === ROW 1: Chart (hero) + Simulation Controls === */}
        <section className="mb-6 md:mb-8">
          <div className="glass-card h-[40vh] sm:h-[48vh] md:h-[52vh] lg:h-[58vh] p-3 md:p-5">
            <InstrumentChart />
          </div>
          <div className="mt-4">
            <SimulationControls disabled={isSessionComplete} />
          </div>
        </section>

        {/* === ROW 2: Market Board + Agent Activity Feed === */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
          <div className="h-[45vh] sm:h-[50vh] lg:h-[55vh]">
            <MarketBoard />
          </div>
          <div className="h-[45vh] sm:h-[50vh] lg:h-[55vh]">
            <CompactAgentFeed />
          </div>
        </section>

        {/* === ROW 3: Agent Status Board (full width) === */}
        <section className="mb-6 md:mb-8">
          <div className="max-h-[420px] overflow-y-auto">
            <AgentStatusBoard />
          </div>
        </section>

        {/* === ROW 4: Trader Panel (full width) === */}
        <section className="mb-6">
          <TraderFooter
            userTrader={userTrader}
            onJumpIn={handleJumpIn}
            onAdjust={handleAdjust}
            isSessionComplete={isSessionComplete}
            onViewAnalysis={handleViewAnalysis}
            variant="panel"
          />
        </section>
      </main>

      {/* Profile Builder Modal */}
      <ProfileBuilder
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSubmit={handleProfileSubmit}
      />

      {/* Post-Market Analysis Modal */}
      <PostMarketAnalysis
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        onRestart={handleRestart}
        userTrader={userTrader}
      />

      {/* ===== FLOATING CHATBOT ===== */}
      {/* Chat overlay panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] sm:w-[420px] h-[520px] rounded-2xl overflow-hidden"
            style={{
              boxShadow: '0 20px 60px hsl(265, 30%, 5%, 0.5), 0 0 40px hsl(270, 60%, 50%, 0.08)',
            }}
          >
            <TradingConsultant className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all"
        style={{
          background: isChatOpen
            ? 'hsl(270, 40%, 25%)'
            : 'linear-gradient(135deg, hsl(270, 80%, 60%) 0%, hsl(290, 70%, 50%) 100%)',
          boxShadow: isChatOpen
            ? '0 4px 15px hsl(270, 40%, 20%, 0.4)'
            : '0 4px 20px hsl(270, 80%, 55%, 0.4), 0 0 30px hsl(270, 70%, 50%, 0.15)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isChatOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </motion.button>
    </div>
  );
};

export default Index;
