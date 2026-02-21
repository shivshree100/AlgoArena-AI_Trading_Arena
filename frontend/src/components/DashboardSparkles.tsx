// ============================================
// Dashboard Background — Rich Purple Waves, Grid & Sparkles
// Inspired by futuristic data-viz dashboard aesthetics
// ============================================

import { motion } from 'framer-motion';

function DashSparkle({ x, y, delay, size = 2, color = '270, 80%, 75%' }: { x: string; y: string; delay: number; size?: number; color?: string }) {
    return (
        <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
                left: x,
                top: y,
                width: size,
                height: size,
                background: `hsl(${color})`,
                boxShadow: `0 0 ${size * 3}px hsl(${color.split(',')[0]}, 80%, 70%, 0.5), 0 0 ${size * 6}px hsl(${color.split(',')[0]}, 60%, 60%, 0.2)`,
            }}
            animate={{
                opacity: [0, 0.8, 0.2, 0.7, 0],
                scale: [0, 1, 0.7, 1, 0],
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                delay,
                ease: 'easeInOut',
            }}
        />
    );
}

export function DashboardSparkles() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">

            {/* ===== SVG BACKGROUND ART ===== */}
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 1440 900"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
            >
                <defs>
                    {/* Gradient fills */}
                    <linearGradient id="dashWaveFill1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(270, 80%, 60%)" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="hsl(270, 80%, 60%)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="dashWaveFill2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(300, 70%, 55%)" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="hsl(300, 70%, 55%)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="dashWaveStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="hsl(280, 70%, 60%)" stopOpacity="0.2" />
                        <stop offset="40%" stopColor="hsl(270, 90%, 75%)" stopOpacity="0.5" />
                        <stop offset="60%" stopColor="hsl(300, 80%, 65%)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(260, 70%, 60%)" stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(270, 40%, 40%)" stopOpacity="0.06" />
                        <stop offset="100%" stopColor="hsl(270, 40%, 40%)" stopOpacity="0.02" />
                    </linearGradient>
                    <filter id="dashGlow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="dashBigGlow">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* ===== GRID LINES ===== */}
                {/* Horizontal grid lines */}
                {[150, 300, 450, 600, 750].map(y => (
                    <line key={`h${y}`} x1="0" y1={y} x2="1440" y2={y} stroke="hsl(270, 30%, 25%)" strokeWidth="0.5" strokeOpacity="0.15" />
                ))}
                {/* Vertical grid lines */}
                {[200, 400, 600, 800, 1000, 1200].map(x => (
                    <line key={`v${x}`} x1={x} y1="0" x2={x} y2="900" stroke="hsl(270, 30%, 25%)" strokeWidth="0.5" strokeOpacity="0.1" />
                ))}
                {/* Diagonal perspective lines */}
                <line x1="0" y1="900" x2="720" y2="200" stroke="hsl(270, 30%, 30%)" strokeWidth="0.3" strokeOpacity="0.08" />
                <line x1="1440" y1="900" x2="720" y2="200" stroke="hsl(270, 30%, 30%)" strokeWidth="0.3" strokeOpacity="0.08" />

                {/* ===== WAVE / MOUNTAIN FORMS ===== */}
                {/* Large mountain fill — back layer */}
                <path
                    d="M0 650 L100 620 L200 580 L300 600 L400 540 L500 500 L600 530 L720 450 L840 420 L960 470 L1080 400 L1200 350 L1320 390 L1440 340 L1440 900 L0 900 Z"
                    fill="url(#dashWaveFill1)"
                />
                {/* Mountain line — back */}
                <path
                    d="M0 650 L100 620 L200 580 L300 600 L400 540 L500 500 L600 530 L720 450 L840 420 L960 470 L1080 400 L1200 350 L1320 390 L1440 340"
                    stroke="hsl(270, 70%, 60%)"
                    strokeWidth="1.5"
                    strokeOpacity="0.3"
                    filter="url(#dashGlow)"
                />

                {/* Second mountain — magenta front layer */}
                <path
                    d="M0 750 L120 720 L240 690 L360 710 L480 670 L600 640 L720 660 L840 600 L960 570 L1080 610 L1200 560 L1320 530 L1440 500 L1440 900 L0 900 Z"
                    fill="url(#dashWaveFill2)"
                />
                <path
                    d="M0 750 L120 720 L240 690 L360 710 L480 670 L600 640 L720 660 L840 600 L960 570 L1080 610 L1200 560 L1320 530 L1440 500"
                    stroke="hsl(300, 60%, 55%)"
                    strokeWidth="1"
                    strokeOpacity="0.2"
                />

                {/* Flowing bright wave — main highlight */}
                <path
                    d="M0 500 C200 450, 350 520, 550 460 C750 400, 900 480, 1100 410 C1200 380, 1350 430, 1440 380"
                    stroke="url(#dashWaveStroke)"
                    strokeWidth="2"
                    filter="url(#dashBigGlow)"
                    fill="none"
                />

                {/* Secondary thin wave */}
                <path
                    d="M0 550 C180 530, 400 570, 600 520 C800 480, 1000 540, 1200 490 C1350 470, 1400 500, 1440 480"
                    stroke="hsl(280, 60%, 55%)"
                    strokeWidth="0.8"
                    strokeOpacity="0.2"
                    fill="none"
                />

                {/* Top accent wave (subtle) */}
                <path
                    d="M0 200 C300 180, 500 220, 720 190 C900 170, 1100 210, 1440 180"
                    stroke="hsl(270, 50%, 45%)"
                    strokeWidth="0.5"
                    strokeOpacity="0.12"
                    fill="none"
                />

                {/* Right side spike chart */}
                <path
                    d="M1050 550 L1100 520 L1150 540 L1200 480 L1250 500 L1300 440 L1350 460 L1400 400 L1440 370"
                    stroke="hsl(300, 80%, 65%)"
                    strokeWidth="1.5"
                    strokeOpacity="0.35"
                    filter="url(#dashGlow)"
                />

                {/* Dotted data line */}
                <path
                    d="M200 400 L280 420 L360 390 L440 410 L520 380 L600 400 L680 370 L760 390"
                    stroke="hsl(270, 60%, 65%)"
                    strokeWidth="1"
                    strokeOpacity="0.2"
                    strokeDasharray="4 6"
                />
            </svg>

            {/* ===== RADIAL GLOWS ===== */}
            {/* Center-top purple glow */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
                style={{
                    background: 'radial-gradient(ellipse at 50% 0%, hsl(270, 60%, 25%, 0.12) 0%, transparent 60%)',
                }}
            />
            {/* Bottom-right magenta glow */}
            <div
                className="absolute bottom-0 right-0 w-[700px] h-[500px]"
                style={{
                    background: 'radial-gradient(ellipse at 80% 100%, hsl(300, 60%, 25%, 0.1) 0%, transparent 60%)',
                }}
            />
            {/* Left mid glow */}
            <div
                className="absolute top-1/3 left-0 w-[500px] h-[400px]"
                style={{
                    background: 'radial-gradient(ellipse at 0% 50%, hsl(260, 50%, 22%, 0.1) 0%, transparent 60%)',
                }}
            />

            {/* ===== SPARKLE DOTS ===== */}
            {/* Purple sparkles */}
            <DashSparkle x="3%" y="8%" delay={0} size={2} />
            <DashSparkle x="12%" y="22%" delay={1.2} size={3} />
            <DashSparkle x="22%" y="5%" delay={2.4} size={2} />
            <DashSparkle x="35%" y="15%" delay={0.6} size={3} />
            <DashSparkle x="48%" y="3%" delay={1.8} size={2} />
            <DashSparkle x="60%" y="12%" delay={3.0} size={3} />
            <DashSparkle x="72%" y="8%" delay={0.9} size={2} />
            <DashSparkle x="85%" y="18%" delay={2.1} size={3} />
            <DashSparkle x="95%" y="6%" delay={1.5} size={2} />
            <DashSparkle x="8%" y="42%" delay={3.2} size={2} />
            <DashSparkle x="18%" y="55%" delay={0.3} size={3} />
            <DashSparkle x="30%" y="35%" delay={2.7} size={2} />
            <DashSparkle x="55%" y="38%" delay={3.5} size={3} />
            <DashSparkle x="78%" y="30%" delay={2.0} size={2} />
            <DashSparkle x="90%" y="48%" delay={1.4} size={3} />
            <DashSparkle x="5%" y="72%" delay={2.8} size={2} />
            <DashSparkle x="28%" y="78%" delay={3.3} size={3} />
            <DashSparkle x="52%" y="68%" delay={2.5} size={2} />
            <DashSparkle x="75%" y="85%" delay={0.2} size={3} />
            <DashSparkle x="92%" y="75%" delay={3.1} size={2} />
            {/* Magenta sparkles */}
            <DashSparkle x="15%" y="35%" delay={1.1} size={3} color="310, 80%, 70%" />
            <DashSparkle x="45%" y="50%" delay={2.9} size={2} color="310, 80%, 70%" />
            <DashSparkle x="68%" y="62%" delay={0.4} size={3} color="310, 80%, 70%" />
            <DashSparkle x="88%" y="88%" delay={1.7} size={2} color="310, 80%, 70%" />
            <DashSparkle x="38%" y="92%" delay={3.4} size={3} color="310, 80%, 70%" />
            {/* White-bright sparkles */}
            <DashSparkle x="25%" y="18%" delay={2.2} size={2} color="280, 40%, 90%" />
            <DashSparkle x="62%" y="45%" delay={0.6} size={2} color="280, 40%, 90%" />
            <DashSparkle x="82%" y="58%" delay={1.3} size={2} color="280, 40%, 90%" />
        </div>
    );
}
