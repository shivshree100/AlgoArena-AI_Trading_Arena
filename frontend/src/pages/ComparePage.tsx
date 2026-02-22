// ============================================
// SmartAlgo - Agent Comparison Page
// Compare performance and decisions across saved agents
// ============================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Bot,
    Trophy,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Activity,
    Trash2,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomAgents } from '@/hooks/useCustomAgents';
import { SavedAgent, SimulationRecord } from '@/types/trading';

// Color palette for agents (up to 6)
const AGENT_COLORS = [
    'hsl(270, 80%, 60%)',
    'hsl(200, 80%, 55%)',
    'hsl(140, 70%, 50%)',
    'hsl(35, 90%, 55%)',
    'hsl(340, 75%, 55%)',
    'hsl(180, 70%, 50%)',
];

function formatCurrency(val: number): string {
    if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (Math.abs(val) >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toFixed(0)}`;
}

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Mini sparkline for PnL history
function MiniChart({
    data,
    color,
    width = 120,
    height = 40,
}: {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}) {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
        .map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 4) - 2;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            {/* Fill area */}
            <polygon
                fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, '')})`}
                points={`0,${height} ${points} ${width},${height}`}
            />
        </svg>
    );
}

export default function ComparePage() {
    const navigate = useNavigate();
    const { savedAgents, simulationRecords, getRecordsForAgent, deleteAgent, clearRecords } = useCustomAgents();
    const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());

    const toggleAgent = (id: string) => {
        setSelectedAgentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < 4) {
                next.add(id);
            }
            return next;
        });
    };

    // Build stats for each agent
    const agentStats = useMemo(() => {
        return savedAgents.map((agent, index) => {
            const records = getRecordsForAgent(agent.id);
            if (records.length === 0) {
                return {
                    agent,
                    color: AGENT_COLORS[index % AGENT_COLORS.length],
                    totalRuns: 0,
                    avgPnlPct: 0,
                    bestRank: 0,
                    winRate: 0,
                    totalPnl: 0,
                    pnlHistory: [] as number[],
                    records: [] as SimulationRecord[],
                };
            }

            const avgPnlPct = records.reduce((s, r) => s + r.pnlPct, 0) / records.length;
            const bestRank = Math.min(...records.map(r => r.rank));
            const wins = records.filter(r => r.pnl > 0).length;
            const totalPnl = records.reduce((s, r) => s + r.pnl, 0);

            return {
                agent,
                color: AGENT_COLORS[index % AGENT_COLORS.length],
                totalRuns: records.length,
                avgPnlPct: Math.round(avgPnlPct * 100) / 100,
                bestRank,
                winRate: Math.round((wins / records.length) * 100),
                totalPnl,
                pnlHistory: records.map(r => r.pnlPct).reverse(),
                records: records.slice(0, 10),
            };
        });
    }, [savedAgents, getRecordsForAgent]);

    // Selected agent records for decision view
    const selectedStats = agentStats.filter(s => selectedAgentIds.has(s.agent.id));

    // All decisions from selected agents (merged & sorted)
    const allDecisions = useMemo(() => {
        const decisions: Array<{
            agentName: string;
            color: string;
            summary: string;
            action: string;
            ticker: string;
            tick: number;
            timestamp: number;
            simDate: string;
        }> = [];

        selectedStats.forEach(stat => {
            const latestRecord = stat.records[0];
            if (!latestRecord) return;
            latestRecord.decisions.forEach(d => {
                decisions.push({
                    agentName: stat.agent.name,
                    color: stat.color,
                    summary: d.summary,
                    action: d.action,
                    ticker: d.ticker,
                    tick: d.tick,
                    timestamp: d.timestamp,
                    simDate: formatDate(latestRecord.timestamp),
                });
            });
        });

        return decisions.sort((a, b) => a.tick - b.tick);
    }, [selectedStats]);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="container px-4 md:px-8 py-4 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/')}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">Agent Comparison Arena</h1>
                            <p className="text-xs text-muted-foreground">
                                Compare performance & decisions across your AI traders
                            </p>
                        </div>
                    </div>
                    {simulationRecords.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearRecords}
                            className="ml-auto text-muted-foreground hover:text-destructive gap-1 text-xs"
                        >
                            <Trash2 className="h-3 w-3" />
                            Clear History
                        </Button>
                    )}
                </div>
            </header>

            <main className="container px-4 md:px-8 py-8">
                {/* Empty state */}
                {savedAgents.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-32 text-center"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-6">
                            <Bot className="h-10 w-10 text-primary/60" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">No Saved Agents Yet</h2>
                        <p className="text-muted-foreground max-w-md mb-6">
                            Create and save your custom AI trading agents from the dashboard, then come back here to compare their performance.
                        </p>
                        <Button onClick={() => navigate('/')} className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Go Create Your First Agent
                        </Button>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        {/* ===== AGENT SELECTOR ===== */}
                        <section>
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                Select Agents to Compare (max 4)
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {agentStats.map((stat) => {
                                    const isSelected = selectedAgentIds.has(stat.agent.id);
                                    return (
                                        <motion.div
                                            key={stat.agent.id}
                                            onClick={() => toggleAgent(stat.agent.id)}
                                            className={`
                        relative p-4 rounded-2xl cursor-pointer transition-all duration-300
                        border-2
                        ${isSelected
                                                    ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/5'
                                                    : 'border-border/40 bg-card/50 hover:border-border hover:bg-card/80'
                                                }
                      `}
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            layout
                                        >
                                            {/* Selection indicator */}
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground"
                                                    style={{ backgroundColor: stat.color }}
                                                >
                                                    ✓
                                                </motion.div>
                                            )}

                                            {/* Agent color bar */}
                                            <div
                                                className="h-1 w-12 rounded-full mb-3"
                                                style={{ backgroundColor: stat.color }}
                                            />

                                            <h3 className="font-semibold text-sm truncate">{stat.agent.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {stat.agent.prompt || 'Default momentum strategy'}
                                            </p>

                                            <div className="mt-3 flex items-center gap-4">
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase">Runs</p>
                                                    <p className="text-sm font-bold">{stat.totalRuns}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase">Avg PnL</p>
                                                    <p className={`text-sm font-bold ${stat.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {stat.avgPnlPct >= 0 ? '+' : ''}{stat.avgPnlPct}%
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase">Win Rate</p>
                                                    <p className="text-sm font-bold">{stat.winRate}%</p>
                                                </div>
                                            </div>

                                            {stat.pnlHistory.length >= 2 && (
                                                <div className="mt-3">
                                                    <MiniChart data={stat.pnlHistory} color={stat.color} width={200} height={30} />
                                                </div>
                                            )}

                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground">
                                                    ₹{stat.agent.capital.toLocaleString()} · {stat.agent.dataSource === 'yfinance' ? '🌐 Live' : '📊 CSV'}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteAgent(stat.agent.id);
                                                        setSelectedAgentIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(stat.agent.id);
                                                            return next;
                                                        });
                                                    }}
                                                    className="p-1 rounded hover:bg-destructive/20 hover:text-destructive transition-all opacity-40 hover:opacity-100"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* ===== PERFORMANCE TABLE ===== */}
                        {selectedStats.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Trophy className="h-4 w-4" />
                                    Performance Summary
                                </h2>
                                <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border/40">
                                                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Agent</th>
                                                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Runs</th>
                                                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Avg PnL%</th>
                                                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Best Rank</th>
                                                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Win Rate</th>
                                                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Total PnL</th>
                                                    <th className="text-center py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Trend</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedStats.map((stat) => (
                                                    <tr key={stat.agent.id} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                                                                <span className="font-semibold">{stat.agent.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center py-3 px-4 font-mono">{stat.totalRuns}</td>
                                                        <td className={`text-center py-3 px-4 font-mono font-semibold ${stat.avgPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {stat.avgPnlPct >= 0 ? '+' : ''}{stat.avgPnlPct}%
                                                        </td>
                                                        <td className="text-center py-3 px-4">
                                                            {stat.bestRank > 0 ? (
                                                                <span className={`inline-flex items-center gap-1 ${stat.bestRank <= 3 ? 'text-yellow-400' : ''}`}>
                                                                    {stat.bestRank <= 3 && '🏆'} #{stat.bestRank}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td className="text-center py-3 px-4">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                                                    <div
                                                                        className="h-full rounded-full transition-all"
                                                                        style={{
                                                                            width: `${stat.winRate}%`,
                                                                            backgroundColor: stat.winRate >= 50 ? 'hsl(140, 70%, 50%)' : 'hsl(0, 70%, 50%)',
                                                                        }}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-mono">{stat.winRate}%</span>
                                                            </div>
                                                        </td>
                                                        <td className={`text-center py-3 px-4 font-mono font-semibold ${stat.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {formatCurrency(stat.totalPnl)}
                                                        </td>
                                                        <td className="text-center py-3 px-4">
                                                            {stat.pnlHistory.length >= 2 ? (
                                                                <MiniChart data={stat.pnlHistory} color={stat.color} width={80} height={24} />
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.section>
                        )}

                        {/* ===== SIMULATION HISTORY ===== */}
                        {selectedStats.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Simulation History
                                </h2>
                                <div className="grid gap-3">
                                    {selectedStats.flatMap(stat =>
                                        stat.records.map(record => ({
                                            ...record,
                                            agentName: stat.agent.name,
                                            color: stat.color,
                                        }))
                                    )
                                        .sort((a, b) => b.timestamp - a.timestamp)
                                        .slice(0, 20)
                                        .map((record) => (
                                            <motion.div
                                                key={record.id}
                                                className="p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 transition-colors"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-8 rounded-full" style={{ backgroundColor: record.color }} />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-sm">{record.agentName}</span>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                                                    #{record.rank}/{record.totalAgents}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {record.marketLabel} · {record.numTicks} days · {formatDate(record.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-bold font-mono ${record.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {record.pnlPct >= 0 ? '+' : ''}{record.pnlPct.toFixed(2)}%
                                                        </p>
                                                        <p className={`text-xs font-mono ${record.pnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                                            {formatCurrency(record.pnl)}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Decisions summary */}
                                                {record.decisions.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {record.decisions.slice(0, 8).map((d, i) => (
                                                            <span
                                                                key={i}
                                                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${d.action === 'BUY'
                                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                                        : 'bg-red-500/15 text-red-400'
                                                                    }`}
                                                            >
                                                                {d.action === 'BUY' ? '↑' : '↓'} {d.ticker}
                                                            </span>
                                                        ))}
                                                        {record.decisions.length > 8 && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                                                +{record.decisions.length - 8} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                </div>
                            </motion.section>
                        )}

                        {/* ===== DECISION LOG ===== */}
                        {allDecisions.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Decision Log (Latest Simulations)
                                </h2>
                                <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
                                    <div className="max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-card">
                                                <tr className="border-b border-border/40">
                                                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Day</th>
                                                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Agent</th>
                                                    <th className="text-center py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Action</th>
                                                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Ticker</th>
                                                    <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allDecisions.map((d, i) => (
                                                    <tr key={i} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                                                        <td className="py-2 px-4 text-xs font-mono text-muted-foreground">
                                                            Day {d.tick + 1}
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                                                                <span className="text-xs font-semibold">{d.agentName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center py-2 px-4">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${d.action === 'BUY'
                                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                                    : 'bg-red-500/15 text-red-400'
                                                                }`}>
                                                                {d.action}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-4 text-xs font-mono font-semibold">{d.ticker}</td>
                                                        <td className="py-2 px-4 text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {d.summary}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.section>
                        )}

                        {/* No selection prompt */}
                        {selectedStats.length === 0 && savedAgents.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16"
                            >
                                <p className="text-muted-foreground">
                                    👆 Select agents above to compare their performance
                                </p>
                            </motion.div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
