import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, animate, AnimatePresence } from 'framer-motion';
import { getProbabilityColor } from '../data/mockData';

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const OUTER_RADIUS = 108;    // rotating outer dashed ring radius
const OUTER_CIRC = 2 * Math.PI * OUTER_RADIUS;

export default function ProbabilityHero({ score, simulatedScore }) {
    const [displayScore, setDisplayScore] = useState(0);
    const prevScore = useRef(0);
    const { color, label } = getProbabilityColor(score);

    // Delta from simulation (passed in optionally)
    const delta = simulatedScore != null ? simulatedScore - score : 0;
    const [showDelta, setShowDelta] = useState(false);
    const prevSimRef = useRef(simulatedScore);

    // Show floating delta bubble whenever simulatedScore changes
    useEffect(() => {
        if (simulatedScore == null) return;
        if (prevSimRef.current === simulatedScore) return;
        prevSimRef.current = simulatedScore;
        if (simulatedScore !== score) {
            setShowDelta(true);
        }
    }, [simulatedScore, score]);

    // Count-up animation
    useEffect(() => {
        const from = prevScore.current;
        const to = score;
        const controls = animate(from, to, {
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1],
            onUpdate(v) { setDisplayScore(Math.round(v)); },
        });
        prevScore.current = score;
        return controls.stop;
    }, [score]);

    const strokeProgress = (score / 100) * CIRCUMFERENCE;

    // Glow colors
    const glowMap = {
        '#00ff88': ['rgba(0,255,136,0.3)', 'rgba(0,255,136,0.08)'],
        '#ffb800': ['rgba(255,184,0,0.3)', 'rgba(255,184,0,0.08)'],
        '#ff3860': ['rgba(255,56,96,0.3)', 'rgba(255,56,96,0.08)'],
    };
    const [glowInner, glowOuter] = glowMap[color] || glowMap['#ffb800'];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4"
        >
            {/* Circle */}
            <div className="relative flex items-center justify-center">

                {/* Radial glow behind ring – pulses every 4s */}
                <motion.div
                    className="absolute rounded-full"
                    animate={{
                        width: [200, 260, 200],
                        height: [200, 260, 200],
                        opacity: [0.5, 0.9, 0.5],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        background: `radial-gradient(ellipse, ${glowInner} 0%, transparent 70%)`,
                        filter: 'blur(20px)',
                    }}
                />

                {/* Outer steady glow halo */}
                <motion.div
                    className="absolute rounded-full"
                    animate={{ backgroundColor: [glowOuter, glowInner, glowOuter] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ width: 240, height: 240, filter: 'blur(40px)' }}
                />

                {/* SVG: outer dashed rotating ring + main arc */}
                <svg width="240" height="240" viewBox="0 0 240 240" className="relative z-10">

                    {/* Track */}
                    <circle
                        cx="120" cy="120" r={RADIUS}
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="10"
                    />
                    {/* Progress arc */}
                    <motion.circle
                        cx="120" cy="120" r={RADIUS}
                        fill="none"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        initial={{ strokeDashoffset: CIRCUMFERENCE }}
                        animate={{ strokeDashoffset: CIRCUMFERENCE - strokeProgress }}
                        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                        transform="rotate(-90 120 120)"
                        style={{ filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color}80)` }}
                    />

                    {/* Tick marks */}
                    {[0, 25, 50, 75].map(pct => {
                        const angle = (pct / 100) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const inner = RADIUS - 16;
                        const outer = RADIUS + 4;
                        return (
                            <line key={pct}
                                x1={120 + inner * Math.cos(rad)} y1={120 + inner * Math.sin(rad)}
                                x2={120 + outer * Math.cos(rad)} y2={120 + outer * Math.sin(rad)}
                                stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"
                            />
                        );
                    })}
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <motion.span
                        className="text-6xl font-black font-mono leading-none"
                        style={{ color, textShadow: `0 0 30px ${color}80, 0 0 60px ${color}40` }}
                    >
                        {displayScore}
                    </motion.span>
                    <span className="text-white/40 text-sm font-medium mt-1">%</span>
                </div>

                {/* Floating delta bubble — appears when simulation changes */}
                <AnimatePresence>
                    {showDelta && delta !== 0 && (
                        <motion.div
                            key={`bubble-${delta}`}
                            initial={{ opacity: 0, y: 0, scale: 0.6 }}
                            animate={{ opacity: 1, y: -55, scale: 1 }}
                            exit={{ opacity: 0, y: -80, scale: 0.8 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            onAnimationComplete={() => setShowDelta(false)}
                            className="absolute top-6 right-0 z-30 px-2 py-1 rounded-full text-xs font-black font-mono"
                            style={{
                                backgroundColor: `${color}25`,
                                border: `1px solid ${color}60`,
                                color,
                                boxShadow: `0 0 12px ${color}50`,
                            }}
                        >
                            {delta > 0 ? '+' : ''}{delta}%
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Label badge */}
            <motion.div
                className="px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase whitespace-nowrap"
                style={{
                    color,
                    backgroundColor: `${color}18`,
                    border: `1px solid ${color}30`,
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
                {label} Probability
            </motion.div>

            {/* Subtitle */}
            <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="text-white/30 text-xs text-center font-mono"
            >
                Based on 14 structural and behavioral factors
            </motion.p>
        </motion.div>
    );
}
