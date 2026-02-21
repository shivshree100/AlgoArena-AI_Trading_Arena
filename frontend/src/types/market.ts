// ============================================
// SmartAlgo - Market Abstraction Types
// WebSocket-ready, event-driven architecture
// ============================================

import { SimulationSpeed } from './trading';

// ============================================
// MARKET INSTRUMENTS
// ============================================

export type InstrumentKind = 'index' | 'sector';

export interface MarketInstrument {
  id: string;                    // "SP500", "SECTOR_TECH"
  kind: InstrumentKind;
  label: string;
  price: number;
  previousPrice: number;
  changePercent: number;
  range: {
    low: number;
    high: number;
  };
}

// NIFTY 50 & Bank NIFTY Sector definitions
export type SectorId =
  | 'IT'
  | 'BANKING'
  | 'PHARMA'
  | 'FMCG'
  | 'AUTO'
  | 'ENERGY'
  | 'METAL'
  | 'TELECOM'
  | 'INFRA'
  | 'FINANCE'
  | 'CONSUMER';

export const SECTOR_CONFIG: Record<SectorId, { label: string; weight: number }> = {
  IT: { label: 'Information Technology', weight: 0.14 },
  BANKING: { label: 'Banking', weight: 0.25 },
  PHARMA: { label: 'Pharmaceuticals', weight: 0.08 },
  FMCG: { label: 'FMCG', weight: 0.10 },
  AUTO: { label: 'Automobile', weight: 0.10 },
  ENERGY: { label: 'Energy', weight: 0.12 },
  METAL: { label: 'Metals & Mining', weight: 0.05 },
  TELECOM: { label: 'Telecom', weight: 0.03 },
  INFRA: { label: 'Infrastructure', weight: 0.07 },
  FINANCE: { label: 'Financial Services', weight: 0.04 },
  CONSUMER: { label: 'Consumer', weight: 0.02 },
};

// ============================================
// MARKET EVENTS (WebSocket-ready)
// ============================================

export interface IndexTickPayload {
  price: number;
  previousPrice: number;
  changePercent: number;
  range: { low: number; high: number };
  timestamp: number;
}

export interface SectorTickPayload {
  sectorId: SectorId;
  price: number;
  previousPrice: number;
  changePercent: number;
  range: { low: number; high: number };
  timestamp: number;
}

export interface SimStatusPayload {
  running: boolean;
  speed: SimulationSpeed;
  tickCount: number;
}

export interface AgentActivityPayload {
  id: string;
  timestamp: number;
  agentType: 'institutional' | 'retail' | 'quant' | 'hft';
  agentName: string;
  action: 'increased' | 'decreased' | 'entered' | 'exited' | 'rebalanced';
  target: string; // Sector name or "overall market"
  summary: string; // Human-readable summary
  isNews?: boolean; // True if this is a news event (special styling)
  sentiment?: 'positive' | 'negative'; // For news events
}

// Agent portfolio value (real-time during simulation)
export interface AgentPortfolioValue {
  value: number;
  pnl: number;
  pnl_pct: number;
}

// Stock mover (gainer or loser)
export interface StockMover {
  ticker: string;
  name?: string;
  price: number;
  change: number;  // percent change
}

// Agent result for end-of-simulation leaderboard
export interface AgentResult {
  id: string;
  name: string;
  type: 'quant' | 'institutional' | 'retail' | 'custom' | 'unknown';
  start_value: number;
  final_value: number;
  pnl: number;
  pnl_pct: number;
  rank: number;
  cash?: number;
  positions?: { ticker: string; quantity: number; value: number }[];
}

export interface SimulationCompletePayload {
  marketIndex: number;
  leaderboard: AgentResult[];
  analysisReport?: string;
}

export interface TopMoversPayload {
  gainers: StockMover[];
  losers: StockMover[];
}

export type MarketEvent =
  | { type: 'INDEX_TICK'; payload: IndexTickPayload }
  | { type: 'SECTOR_TICK'; payload: SectorTickPayload }
  | { type: 'SIM_STATUS'; payload: SimStatusPayload }
  | { type: 'AGENT_ACTIVITY'; payload: AgentActivityPayload }
  | { type: 'SIMULATION_COMPLETE'; payload: SimulationCompletePayload }
  | { type: 'PORTFOLIO_UPDATE'; payload: Record<string, AgentPortfolioValue> }
  | { type: 'TOP_MOVERS_UPDATE'; payload: TopMoversPayload };

// ============================================
// MARKET STORE STATE
// ============================================

export interface TickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketStore {
  // Instruments
  instruments: Record<string, MarketInstrument>;
  tickHistory: Record<string, TickData[]>;

  // Active selection
  activeInstrumentId: string;

  // Simulation state
  simStatus: {
    running: boolean;
    speed: SimulationSpeed;
    tickCount: number;
    maxTicks: number;
  };

  // Agent activity feed
  agentActivities: AgentActivityPayload[];

  // Real-time agent portfolio values
  agentPortfolios: Record<string, AgentPortfolioValue>;

  // Top movers (gainers and losers)
  topMovers: {
    gainers: StockMover[];
    losers: StockMover[];
  };

  // Subscriptions (for future WebSocket)
  subscribedInstruments: Set<string>;

  // End-of-simulation results
  simulationResults?: {
    marketIndex: number;
    leaderboard: AgentResult[];
    analysisReport?: string;
  };
}

// ============================================
// STORE ACTIONS
// ============================================

export type MarketAction =
  | { type: 'APPLY_EVENT'; event: MarketEvent }
  | { type: 'SET_ACTIVE_INSTRUMENT'; instrumentId: string }
  | { type: 'SIM_TOGGLE_PLAY' }
  | { type: 'SIM_SET_SPEED'; speed: SimulationSpeed }
  | { type: 'SIM_SET_MAX_TICKS'; maxTicks: number }
  | { type: 'SIM_RESET' }
  | { type: 'SIM_SEEK'; tick: number }
  | { type: 'SUBSCRIBE'; instrumentId: string }
  | { type: 'UNSUBSCRIBE'; instrumentId: string };
