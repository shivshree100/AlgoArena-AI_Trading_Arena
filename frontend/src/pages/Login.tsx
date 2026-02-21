import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Lock, Mail, Eye, EyeOff, AlertCircle, Zap,
    TrendingUp, BarChart3, Shield, ArrowRight, Sun, Moon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import logo from '@/assets/logo.png';

interface LoginProps {
    onLogin: (username: string, password: string) => boolean;
}

// ─── Theme tokens ───────────────────────────────────────────────
const themes = {
    dark: {
        bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        glowA: 'rgba(139, 92, 246, 0.15)',
        glowB: 'rgba(236, 72, 153, 0.1)',
        glowC: 'rgba(59, 130, 246, 0.08)',
        particleColor: 'rgba(168, 85, 247, 0.4)',
        gridStroke: 'white',
        gridOpacity: '0.03',
        // Left panel
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255,255,255,0.5)',
        textMuted: 'rgba(255,255,255,0.4)',
        textFaint: 'rgba(255,255,255,0.2)',
        textStat: 'rgba(255,255,255,0.9)',
        textStatLabel: 'rgba(255,255,255,0.4)',
        headlineGrad: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #f9a8d4 100%)',
        borderSub: 'rgba(255,255,255,0.06)',
        logoBg: 'linear-gradient(135deg, rgba(168,85,247,0.2) 0%, rgba(236,72,153,0.2) 100%)',
        logoBorder: 'rgba(168,85,247,0.3)',
        pillBg: (c: string) => `${c}15`,
        pillBorder: (c: string) => `${c}30`,
        // Right panel / form card
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.08)',
        cardShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        formHeading: '#ffffff',
        formSub: 'rgba(255,255,255,0.4)',
        inputBg: 'rgba(255,255,255,0.04)',
        inputBorder: 'rgba(255,255,255,0.08)',
        inputText: 'text-white',
        inputPlaceholder: 'placeholder:text-white/20',
        eyeColor: 'text-white/30 hover:text-white/60',
        hoverOverlay: 'rgba(139,92,246,0.05)',
        errorBg: 'rgba(239,68,68,0.08)',
        errorBorder: 'rgba(239,68,68,0.15)',
        errorText: '#f87171',
        dividerLine: 'rgba(255,255,255,0.06)',
        dividerText: 'rgba(255,255,255,0.2)',
        footerText: 'rgba(255,255,255,0.25)',
        footerTextFaint: 'rgba(255,255,255,0.15)',
        termsText: 'rgba(255,255,255,0.2)',
        termsLink: 'text-purple-400/60 hover:text-purple-400',
        toggleBg: 'rgba(255,255,255,0.08)',
        toggleBorder: 'rgba(255,255,255,0.12)',
        toggleIcon: 'text-yellow-300',
    },
    light: {
        bg: 'linear-gradient(135deg, #e8e0f0 0%, #f0ecf8 40%, #faf8ff 100%)',
        glowA: 'rgba(139, 92, 246, 0.08)',
        glowB: 'rgba(236, 72, 153, 0.05)',
        glowC: 'rgba(59, 130, 246, 0.04)',
        particleColor: 'rgba(139, 92, 246, 0.15)',
        gridStroke: '#6d28d9',
        gridOpacity: '0.04',
        // Left panel
        textPrimary: '#1e1b4b',
        textSecondary: 'rgba(30,27,75,0.55)',
        textMuted: 'rgba(30,27,75,0.45)',
        textFaint: 'rgba(30,27,75,0.25)',
        textStat: '#1e1b4b',
        textStatLabel: 'rgba(30,27,75,0.45)',
        headlineGrad: 'linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #db2777 100%)',
        borderSub: 'rgba(30,27,75,0.08)',
        logoBg: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 100%)',
        logoBorder: 'rgba(139,92,246,0.2)',
        pillBg: (c: string) => `${c}10`,
        pillBorder: (c: string) => `${c}25`,
        // Right panel / form card
        cardBg: 'rgba(255, 255, 255, 0.7)',
        cardBorder: 'rgba(139, 92, 246, 0.12)',
        cardShadow: '0 20px 60px rgba(139, 92, 246, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
        formHeading: '#1e1b4b',
        formSub: 'rgba(30,27,75,0.45)',
        inputBg: 'rgba(255,255,255,0.8)',
        inputBorder: 'rgba(139,92,246,0.15)',
        inputText: 'text-gray-900',
        inputPlaceholder: 'placeholder:text-gray-400',
        eyeColor: 'text-gray-400 hover:text-gray-600',
        hoverOverlay: 'rgba(139,92,246,0.03)',
        errorBg: 'rgba(239,68,68,0.06)',
        errorBorder: 'rgba(239,68,68,0.2)',
        errorText: '#dc2626',
        dividerLine: 'rgba(139,92,246,0.08)',
        dividerText: 'rgba(30,27,75,0.2)',
        footerText: 'rgba(30,27,75,0.3)',
        footerTextFaint: 'rgba(30,27,75,0.18)',
        termsText: 'rgba(30,27,75,0.25)',
        termsLink: 'text-purple-600/60 hover:text-purple-600',
        toggleBg: 'rgba(139,92,246,0.08)',
        toggleBorder: 'rgba(139,92,246,0.15)',
        toggleIcon: 'text-indigo-700',
    },
};

type Theme = typeof themes.dark;

// Floating particle component
function FloatingParticle({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) {
    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                left: x,
                top: y,
                width: size,
                height: size,
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            }}
            animate={{
                y: [-20, 20, -20],
                opacity: [0.3, 0.7, 0.3],
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 4 + delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
            }}
        />
    );
}

export default function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isDark, setIsDark] = useState(true);

    const t: Theme = isDark ? themes.dark : themes.light;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('Please enter both username and password');
            return;
        }

        const success = onLogin(username.trim(), password.trim());
        if (!success) {
            setError('Invalid username or password');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 600);
        }
    };

    return (
        <div
            className="min-h-screen relative overflow-hidden flex transition-all duration-700"
            style={{ background: t.bg }}
        >
            {/* ── Theme toggle button ── */}
            <motion.button
                onClick={() => setIsDark(!isDark)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`absolute top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${t.toggleIcon}`}
                style={{
                    background: t.toggleBg,
                    border: `1px solid ${t.toggleBorder}`,
                    backdropFilter: 'blur(12px)',
                }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
                <AnimatePresence mode="wait">
                    {isDark ? (
                        <motion.div
                            key="sun"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Sun size={18} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="moon"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Moon size={18} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Ambient glow effects */}
            <div
                className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none transition-all duration-700"
                style={{ background: `radial-gradient(circle, ${t.glowA} 0%, transparent 70%)`, filter: 'blur(60px)' }}
            />
            <div
                className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none transition-all duration-700"
                style={{ background: `radial-gradient(circle, ${t.glowB} 0%, transparent 70%)`, filter: 'blur(80px)' }}
            />
            <div
                className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full pointer-events-none transition-all duration-700"
                style={{ background: `radial-gradient(circle, ${t.glowC} 0%, transparent 70%)`, filter: 'blur(60px)' }}
            />

            {/* Floating particles */}
            <FloatingParticle delay={0} x="10%" y="20%" size={6} color={t.particleColor} />
            <FloatingParticle delay={1.5} x="25%" y="70%" size={4} color={t.particleColor} />
            <FloatingParticle delay={0.8} x="80%" y="15%" size={5} color={t.particleColor} />
            <FloatingParticle delay={2} x="70%" y="80%" size={3} color={t.particleColor} />
            <FloatingParticle delay={1} x="45%" y="45%" size={4} color={t.particleColor} />
            <FloatingParticle delay={2.5} x="90%" y="50%" size={5} color={t.particleColor} />

            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ opacity: parseFloat(t.gridOpacity) }}>
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <pattern id="loginGrid" width="5" height="5" patternUnits="userSpaceOnUse">
                            <path d="M 5 0 L 0 0 0 5" fill="none" stroke={t.gridStroke} strokeWidth="0.3" />
                        </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#loginGrid)" />
                </svg>
            </div>

            {/* ============================================ */}
            {/* LEFT SIDE — Hero Content                     */}
            {/* ============================================ */}
            <div className="hidden lg:flex lg:w-[55%] relative p-12 xl:p-16 flex-col justify-between z-10">

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center gap-3 relative z-10 pl-8 xl:pl-12"
                >
                    <img src={logo} alt="AlgoArena" className="w-24 h-24 rounded-xl object-contain" />
                    <span className="text-2xl font-bold tracking-tight transition-colors duration-500" style={{ color: t.textPrimary }}>
                        AlgoArena
                    </span>
                </motion.div>

                {/* Main content */}
                <div className="flex-1 flex flex-col justify-center -mt-8 relative z-10 pl-8 xl:pl-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        <h1
                            className="text-5xl xl:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight"
                            style={{
                                backgroundImage: t.headlineGrad,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                color: 'transparent',
                            }}
                        >
                            Level Up Your Bags.
                            <br />
                            No Cap Strategies.
                        </h1>
                        <p className="text-lg max-w-lg leading-relaxed mb-10 transition-colors duration-500" style={{ color: t.textSecondary }}>
                            The ultimate playground for alpha hunters. Build strategies that actually hit
                            and let our AI handle the math while you secure the bread.
                        </p>

                        {/* CTA Button */}
                        <motion.button
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-white text-base transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                                boxShadow: isHovered
                                    ? '0 8px 40px rgba(139, 92, 246, 0.5), 0 0 60px rgba(236, 72, 153, 0.2)'
                                    : '0 4px 20px rgba(139, 92, 246, 0.3)',
                            }}
                        >
                            <Zap className="w-5 h-5" />
                            Start Cooking
                            <motion.div
                                animate={{ x: isHovered ? 4 : 0 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                            >
                                <ArrowRight className="w-5 h-5" />
                            </motion.div>
                        </motion.button>
                    </motion.div>

                    {/* Feature pills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex flex-wrap gap-3 mt-12"
                    >
                        {[
                            { icon: TrendingUp, label: 'Real-time Vibes', color: '#8b5cf6' },
                            { icon: BarChart3, label: 'Strategy Main Character', color: '#ec4899' },
                            { icon: Shield, label: 'AI Sentient Sidekicks', color: '#3b82f6' },
                        ].map(({ icon: Icon, label, color }) => (
                            <div
                                key={label}
                                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-500"
                                style={{
                                    background: t.pillBg(color),
                                    border: `1px solid ${t.pillBorder(color)}`,
                                    color: color,
                                }}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Isometric laptop graphic */}
                <div
                    className="absolute left-[-2%] bottom-[2%] w-[92%] pointer-events-none z-0"
                    style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
                >
                    <div
                        className="absolute inset-0 -z-10 transition-all duration-700"
                        style={{
                            background: `radial-gradient(ellipse 70% 40% at 45% 65%, ${isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.1)'} 0%, ${isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.05)'} 30%, transparent 60%)`,
                            filter: 'blur(50px)',
                            transform: 'scale(1.8)',
                        }}
                    />

                    <motion.svg
                        viewBox="0 0 560 420"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-auto transition-opacity duration-700"
                        style={{
                            transform: 'rotateX(55deg) rotateZ(-35deg) scale(0.9)',
                            transformStyle: 'preserve-3d',
                            opacity: isDark ? 0.45 : 0.25,
                        }}
                        animate={{ y: [-6, 6, -6] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <defs>
                            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                                <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.545  0 0 0 0 0.361  0 0 0 0 0.965  0 0 0 1 0" result="purpleBlur" />
                                <feMerge><feMergeNode in="purpleBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                                <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.345  0 0 0 0 0.510  0 0 0 0 0.965  0 0 0 0.8 0" result="blueGlow" />
                                <feMerge><feMergeNode in="blueGlow" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="screenShine" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="white" stopOpacity="0.5" /><stop offset="50%" stopColor="white" stopOpacity="0" /><stop offset="100%" stopColor="white" stopOpacity="0.1" />
                            </linearGradient>
                        </defs>

                        {/* Glow ring under laptop */}
                        <ellipse cx="235" cy="320" rx="200" ry="20" fill="none" stroke="rgba(100,140,255,0.3)" strokeWidth="2" filter="url(#strongGlow)" />
                        <ellipse cx="235" cy="320" rx="180" ry="14" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1.5" filter="url(#strongGlow)" />

                        {/* Screen bezel */}
                        <rect x="50" y="30" width="370" height="250" rx="12" fill="rgba(15,12,41,0.85)" stroke="rgba(139,92,246,0.4)" strokeWidth="1.5" filter="url(#neonGlow)" />
                        <rect x="60" y="40" width="350" height="225" rx="8" fill="rgba(20,15,50,0.9)" stroke="rgba(139,92,246,0.15)" strokeWidth="0.5" />
                        <circle cx="235" cy="35" r="2" fill="rgba(139,92,246,0.3)" />

                        {/* Laptop base */}
                        <path d="M 30 280 L 50 280 Q 50 280 50 280 L 420 280 L 440 280 L 460 310 Q 462 315 457 318 L 13 318 Q 8 315 10 310 Z" fill="rgba(25,20,55,0.75)" stroke="rgba(139,92,246,0.3)" strokeWidth="1" filter="url(#neonGlow)" />
                        <rect x="70" y="284" width="330" height="28" rx="4" fill="rgba(30,25,60,0.5)" stroke="rgba(139,92,246,0.1)" strokeWidth="0.5" />
                        <rect x="190" y="290" width="90" height="18" rx="4" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.15)" strokeWidth="0.5" />
                        {[288, 296, 304].map((ky) => (
                            <g key={ky}>
                                {Array.from({ length: 14 }, (_, i) => (
                                    <rect key={i} x={75 + i * 8} y={ky} width="6" height="5" rx="1" fill="rgba(139,92,246,0.07)" stroke="rgba(139,92,246,0.08)" strokeWidth="0.3" />
                                ))}
                            </g>
                        ))}
                        <line x1="50" y1="280" x2="420" y2="280" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5" filter="url(#neonGlow)" />

                        {/* Screen content */}
                        <clipPath id="screenClip"><rect x="60" y="40" width="350" height="225" rx="8" /></clipPath>
                        <g clipPath="url(#screenClip)">
                            <rect x="60" y="40" width="350" height="22" fill="rgba(139,92,246,0.08)" />
                            <circle cx="78" cy="51" r="3" fill="rgba(244,114,182,0.4)" />
                            <circle cx="90" cy="51" r="3" fill="rgba(250,204,21,0.3)" />
                            <circle cx="102" cy="51" r="3" fill="rgba(74,222,128,0.3)" />
                            <rect x="200" y="47" width="80" height="8" rx="4" fill="rgba(255,255,255,0.06)" />

                            {[100, 130, 160, 190, 220].map((y) => (
                                <line key={y} x1="70" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                            ))}

                            {[
                                { x: 100, o: 190, c: 165, h: 152, l: 200, up: true },
                                { x: 130, o: 165, c: 178, h: 155, l: 185, up: false },
                                { x: 155, o: 178, c: 148, h: 138, l: 188, up: true },
                                { x: 180, o: 148, c: 160, h: 138, l: 170, up: false },
                                { x: 205, o: 160, c: 128, h: 118, l: 170, up: true },
                                { x: 230, o: 128, c: 142, h: 118, l: 150, up: false },
                                { x: 255, o: 142, c: 118, h: 108, l: 152, up: true },
                                { x: 280, o: 118, c: 130, h: 108, l: 140, up: false },
                                { x: 305, o: 130, c: 105, h: 95, l: 142, up: true },
                                { x: 330, o: 105, c: 115, h: 92, l: 125, up: false },
                                { x: 355, o: 115, c: 95, h: 85, l: 120, up: true },
                                { x: 380, o: 95, c: 108, h: 88, l: 115, up: false },
                            ].map(({ x, o, c, h, l, up }, i) => (
                                <g key={i}>
                                    <line x1={x} y1={h} x2={x} y2={l} stroke={up ? '#a78bfa' : '#f472b6'} strokeWidth="1" opacity="0.6" />
                                    <rect x={x - 5} y={Math.min(o, c)} width="10" height={Math.abs(o - c) || 2} rx="1"
                                        fill={up ? 'rgba(167,139,250,0.5)' : 'rgba(244,114,182,0.4)'}
                                        stroke={up ? '#a78bfa' : '#f472b6'} strokeWidth="0.5" />
                                </g>
                            ))}

                            <motion.path
                                d="M 100 185 Q 140 170 155 155 Q 180 148 205 135 Q 230 130 255 122 Q 280 118 305 108 Q 330 102 355 95 Q 370 90 390 88"
                                stroke="url(#lineGrad)" strokeWidth="2" fill="none" strokeLinecap="round"
                                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                                transition={{ duration: 2, delay: 0.5 }}
                            />
                            <path d="M 100 185 Q 140 170 155 155 Q 180 148 205 135 Q 230 130 255 122 Q 280 118 305 108 Q 330 102 355 95 Q 370 90 390 88 L 390 255 L 100 255 Z" fill="url(#areaGrad)" opacity="0.25" />

                            {[100, 130, 155, 180, 205, 230, 255, 280, 305, 330, 355, 380].map((x, i) => (
                                <rect key={`v-${i}`} x={x - 4} y={250 - (6 + Math.sin(i * 1.1) * 12)} width="8" height={6 + Math.sin(i * 1.1) * 12} rx="1"
                                    fill={i % 2 === 0 ? 'rgba(167,139,250,0.2)' : 'rgba(244,114,182,0.15)'} />
                            ))}
                        </g>

                        {/* Floating panels */}
                        <g opacity="0.7">
                            <rect x="430" y="55" width="120" height="90" rx="12" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.18)" strokeWidth="0.5" />
                            <rect x="445" y="73" width="45" height="4" rx="2" fill="rgba(167,139,250,0.35)" />
                            <rect x="445" y="85" width="65" height="4" rx="2" fill="rgba(168,85,247,0.2)" />
                            <rect x="445" y="97" width="38" height="4" rx="2" fill="rgba(236,72,153,0.3)" />
                            <rect x="445" y="109" width="58" height="4" rx="2" fill="rgba(59,130,246,0.25)" />
                            <rect x="445" y="121" width="48" height="4" rx="2" fill="rgba(74,222,128,0.2)" />
                        </g>
                        <g opacity="0.6">
                            <rect x="440" y="165" width="110" height="65" rx="12" fill="rgba(236,72,153,0.05)" stroke="rgba(236,72,153,0.15)" strokeWidth="0.5" />
                            <polyline points="455,210 468,202 480,206 492,194 504,198 516,188 528,192" stroke="#f472b6" strokeWidth="1.5" fill="none" opacity="0.5" />
                            <circle cx="528" cy="192" r="2.5" fill="#f472b6" opacity="0.6" />
                        </g>

                        <rect x="60" y="40" width="350" height="225" rx="8" fill="url(#screenShine)" opacity="0.04" />
                    </motion.svg>
                </div>

                {/* Stats bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="grid grid-cols-3 gap-8 pt-8 relative z-10 transition-colors duration-500"
                    style={{ borderTop: `1px solid ${t.borderSub}` }}
                >
                    {[
                        { value: '10+', label: 'AI Crushing It' },
                        { value: '50+', label: 'Stonks Tracked' },
                        { value: '5', label: 'Meta Strategies' },
                    ].map(({ value, label }) => (
                        <div key={label}>
                            <div className="text-2xl font-bold mb-0.5 transition-colors duration-500" style={{ color: t.textStat }}>{value}</div>
                            <div className="text-xs uppercase tracking-wider transition-colors duration-500" style={{ color: t.textStatLabel }}>{label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* ============================================ */}
            {/* RIGHT SIDE — Login Form                      */}
            {/* ============================================ */}
            <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-10">
                        <img src={logo} alt="AlgoArena" className="w-20 h-20 rounded-xl object-contain" />
                        <span className="text-xl font-bold transition-colors duration-500" style={{ color: t.textPrimary }}>AlgoArena</span>
                    </div>

                    {/* Mobile headline */}
                    <div className="lg:hidden mb-8">
                        <h1
                            className="text-3xl font-extrabold leading-tight mb-3"
                            style={{
                                backgroundImage: t.headlineGrad,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                color: 'transparent',
                            }}
                        >
                            Trade Smarter.<br />Backtest Better.
                        </h1>
                        <p className="text-sm transition-colors duration-500" style={{ color: t.textMuted }}>
                            Quantitative research for modern traders.
                        </p>
                    </div>

                    {/* Glass Form Card */}
                    <div
                        className="rounded-3xl p-8 sm:p-10 transition-all duration-500"
                        style={{
                            background: t.cardBg,
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: `1px solid ${t.cardBorder}`,
                            boxShadow: t.cardShadow,
                        }}
                    >
                        {/* Header */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold mb-2 transition-colors duration-500" style={{ color: t.formHeading }}>
                                Ayo, Welcome Back
                            </h2>
                            <p className="text-sm transition-colors duration-500" style={{ color: t.formSub }}>
                                Sign in to witness your portfolio glow up
                            </p>
                        </div>

                        {/* Form */}
                        <motion.form
                            onSubmit={handleSubmit}
                            animate={{ x: isShaking ? [0, -8, 8, -8, 8, 0] : 0 }}
                            transition={isShaking ? { duration: 0.5 } : {}}
                            className="space-y-5"
                        >
                            {/* Username */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="username"
                                    className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors duration-500"
                                    style={{ color: t.textMuted }}
                                >
                                    <Mail size={12} />
                                    Username
                                </label>
                                <div className="relative group">
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(e) => { setUsername(e.target.value); setError(''); }}
                                        className={`h-12 text-sm rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40 ${t.inputText} ${t.inputPlaceholder}`}
                                        style={{
                                            background: t.inputBg,
                                            borderColor: t.inputBorder,
                                        }}
                                        autoFocus
                                        autoComplete="username"
                                    />
                                    <div
                                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                        style={{ background: `linear-gradient(135deg, ${t.hoverOverlay} 0%, ${t.hoverOverlay} 100%)` }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors duration-500"
                                    style={{ color: t.textMuted }}
                                >
                                    <Lock size={12} />
                                    Password
                                </label>
                                <div className="relative group">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                        className={`h-12 text-sm rounded-xl pr-12 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40 ${t.inputText} ${t.inputPlaceholder}`}
                                        style={{
                                            background: t.inputBg,
                                            borderColor: t.inputBorder,
                                        }}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${t.eyeColor}`}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                    <div
                                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                        style={{ background: `linear-gradient(135deg, ${t.hoverOverlay} 0%, ${t.hoverOverlay} 100%)` }}
                                    />
                                </div>
                            </div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl"
                                        style={{
                                            color: t.errorText,
                                            background: t.errorBg,
                                            border: `1px solid ${t.errorBorder}`,
                                        }}
                                    >
                                        <AlertCircle size={14} className="shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02, boxShadow: '0 8px 40px rgba(139, 92, 246, 0.4)' }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all relative overflow-hidden group"
                                style={{
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                                }}
                            >
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{
                                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                                        transform: 'skewX(-20deg)',
                                    }}
                                />
                                <Zap size={16} className="relative z-10" />
                                <span className="relative z-10">Sign In</span>
                            </motion.button>
                        </motion.form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px transition-colors duration-500" style={{ background: t.dividerLine }} />
                            <span className="text-xs uppercase tracking-wider transition-colors duration-500" style={{ color: t.dividerText }}>Secure Access</span>
                            <div className="flex-1 h-px transition-colors duration-500" style={{ background: t.dividerLine }} />
                        </div>

                        {/* Footer */}
                        <p className="text-center text-xs leading-relaxed transition-colors duration-500" style={{ color: t.footerText }}>
                            AI-Powered Quantitative Trading Platform
                            <br />
                            <span style={{ color: t.footerTextFaint }}>Protected by enterprise-grade encryption</span>
                        </p>
                    </div>

                    {/* Terms */}
                    <p className="text-center text-xs mt-6 transition-colors duration-500" style={{ color: t.termsText }}>
                        By signing in, you agree to our{' '}
                        <span className={`cursor-pointer transition-colors ${t.termsLink}`}>Terms of Service</span>{' '}
                        and{' '}
                        <span className={`cursor-pointer transition-colors ${t.termsLink}`}>Privacy Policy</span>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
