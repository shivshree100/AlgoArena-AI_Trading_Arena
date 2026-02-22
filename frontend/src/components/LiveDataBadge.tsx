import { motion } from 'framer-motion';
import { Globe, Database } from 'lucide-react';

interface LiveDataBadgeProps {
  dataSource: 'csv' | 'yfinance';
  market?: string;
  className?: string;
}

export function LiveDataBadge({ dataSource, market, className = '' }: LiveDataBadgeProps) {
  if (dataSource === 'csv') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border ${className}`}>
        <Database size={12} className="text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Simulated Data</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 ${className}`}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Globe size={12} className="text-primary" />
      </motion.div>
      <span className="text-xs font-medium text-primary">
        Live Data {market && `• ${market.toUpperCase()}`}
      </span>
    </motion.div>
  );
}
