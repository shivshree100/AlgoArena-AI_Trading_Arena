import { Zap, LogOut, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '@/assets/logo.png';

interface HeaderProps {
  onLogout?: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="gradient-header sticky top-0 z-40">
      <div className="container flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 flex items-center justify-center cursor-pointer"
            whileHover={{ scale: 1.05, rotate: 5 }}
            onClick={() => navigate('/')}
          >
            <img src={logo} alt="SmartAlgo Logo" className="w-10 h-10 object-contain" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AlgoArena</h1>
            <p className="text-xs text-muted-foreground">Live Trading Competition and Backtesting</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate('/')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/'
                ? 'bg-white/10 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/backtest')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${location.pathname === '/backtest'
                ? 'bg-violet-500/15 text-violet-300'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Backtest
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gain/10 border border-gain/20">
            <motion.div
              className="w-2 h-2 rounded-full bg-gain"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-gain">Live</span>
          </div>




          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
