export interface TraderProfile {
  id: string;
  name: string;
  strategyType: 'momentum' | 'meanReversion' | 'passive' | 'sentiment' | 'custom';
  riskProfile: number; // 0-100
  reactionSpeed: number; // 0-100
  enableAIReasoning: boolean;
  createdAt: Date;
  type: 'institutional' | 'retail' | 'quant' | 'hft' | 'custom';
}

export interface TraderResult {
  id: string;
  name: string;
  type: TraderProfile['type'];
  currentPnL: number;
  previousPnL: number;
  sharpe: number;
  winRate: number;
  sparklineData: number[];
  rank: number;
  previousRank: number;
  isUser?: boolean;
  customPrompt?: string; // Custom AI strategy prompt
  capital?: number; // Starting capital for custom agents
  dataSource?: 'csv' | 'yfinance'; // Data source selection
  yfMarket?: string; // yfinance market type
  yfPeriod?: string; // yfinance historical period
  yfInterval?: string; // yfinance data interval
}

export interface TickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  regime: 'bull' | 'bear' | 'sideways';
  volatility: number;
}

export type SimulationSpeed = 'slow' | 'normal' | 'fast';

// ============================================
// PERSISTENT CUSTOM AGENTS
// ============================================

export interface SavedAgent {
  id: string;
  name: string;
  prompt: string;
  capital: number;
  dataSource: 'csv' | 'yfinance';
  marketType?: string;
  yfMarket?: string;
  yfPeriod?: string;
  yfInterval?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AgentDecision {
  tick: number;
  action: 'BUY' | 'SELL';
  ticker: string;
  size: number;
  summary: string;
  timestamp: number;
}

export interface SimulationRecord {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: number;
  rank: number;
  totalAgents: number;
  pnl: number;
  pnlPct: number;
  startValue: number;
  finalValue: number;
  marketLabel: string;
  numTicks: number;
  decisions: AgentDecision[];
}
