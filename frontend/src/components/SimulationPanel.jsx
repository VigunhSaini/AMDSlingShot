import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { getProbabilityColor } from '../data/mockData';

/* ── Canvas-based liquid bar with correct path drawing ── */
function LiquidBar({ fillPercent, color, basePercent }) {
    const canvasRef = useRef(null);
    const displayFillRef = useRef(fillPercent);
    const rafRef = useRef(null);
    const tRef = useRef(0);

    // Animate fill level smoothly when fillPercent changes
    useEffect(() => {
        const target = fillPercent;
        const startFill = displayFillRef.current;
        if (startFill === target) return;
        let startTime = null;
        const duration = 900;
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const step = ts => {
            if (!startTime) startTime = ts;
            const p = Math.min((ts - startTime) / duration, 1);
            displayFillRef.current = startFill + (target - startFill) * easeOut(p);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [fillPercent]);

    // Main render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Sync canvas pixel size to its CSS display size
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            canvas.width = Math.round(rect.width);
            canvas.height = Math.round(rect.height);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        const ctx = canvas.getContext('2d');

        const draw = ts => {
            tRef.current++;
            const t = tRef.current;
            const W = canvas.width;
            const H = canvas.height;
            if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return; }

            ctx.clearRect(0, 0, W, H);

            const pct = displayFillRef.current / 100;
            const fillY = H * (1 - pct);  // y-coordinate of the mean wave level

            const waveAmp = 5;            // px amplitude
            const speed1 = 0.055;
            const speed2 = 0.035;
            const ph1 = t * speed1;
            const ph2 = t * speed2 + Math.PI * 0.7;

            // Helper: y of wave surface at x
            const waveY = x =>
                fillY
                + Math.sin((x / W) * Math.PI * 2.5 + ph1) * waveAmp
                + Math.sin((x / W) * Math.PI * 4 + ph2) * waveAmp * 0.45;

            // ── Filled liquid shape ──────────────────────────────────────
            ctx.beginPath();
            ctx.moveTo(0, H);                 // bottom-left

            // Wave surface left → right (using lineTo, NOT moveTo)
            for (let x = 0; x <= W; x++) {
                ctx.lineTo(x, waveY(x));
            }

            ctx.lineTo(W, H);                 // bottom-right
            ctx.closePath();                  // closes back to (0, H) — no diagonal artifact

            // Gradient fill
            const grad = ctx.createLinearGradient(0, fillY - waveAmp, 0, H);
            grad.addColorStop(0, `${color}80`);
            grad.addColorStop(0.45, `${color}99`);
            grad.addColorStop(1, `${color}cc`);
            ctx.fillStyle = grad;
            ctx.fill();

            // ── Wave crest glow line ─────────────────────────────────────
            ctx.beginPath();
            for (let x = 0; x <= W; x++) {
                x === 0 ? ctx.moveTo(x, waveY(x)) : ctx.lineTo(x, waveY(x));
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // ── Baseline dashed marker ───────────────────────────────────
            const baseY = H * (1 - basePercent / 100);
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.moveTo(0, baseY);
            ctx.lineTo(W, baseY);
            ctx.strokeStyle = `${color}50`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);

            // Baseline dot
            ctx.beginPath();
            ctx.arc(W - 5, baseY, 3, 0, Math.PI * 2);
            ctx.fillStyle = `${color}cc`;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;

            // ── Tick marks at 25 / 50 / 75% ─────────────────────────────
            [25, 50, 75].forEach(pctMark => {
                const ty = H * (1 - pctMark / 100);
                ctx.beginPath();
                ctx.moveTo(0, ty);
                ctx.lineTo(7, ty);
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(rafRef.current);
            ro.disconnect();
        };
    }, [color, basePercent]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}

/* ── Main panel ─────────────────────────────────────────────────────────── */
export default function SimulationPanel({ currentScore, baseScore, activeToggles }) {
    const [displayScore, setDisplayScore] = useState(currentScore);
    const prevRef = useRef(currentScore);
    const delta = currentScore - baseScore;
    const { color } = getProbabilityColor(currentScore);

    useEffect(() => {
        const from = prevRef.current;
        const to = currentScore;
        if (from === to) return;
        const controls = animate(from, to, {
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1],
            onUpdate(v) { setDisplayScore(Math.round(v)); },
        });
        prevRef.current = currentScore;
        return controls.stop;
    }, [currentScore]);

    const activeCount = Object.values(activeToggles).filter(Boolean).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="glass-card p-5 h-full flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-neon-purple animate-pulse flex-shrink-0" />
                <h2 className="text-white/70 text-xs font-medium uppercase tracking-widest">Live Sim</h2>
            </div>

            {/* Score + Delta */}
            <div className="flex flex-col items-center mb-3">
                <motion.span
                    className="text-4xl font-black font-mono leading-none"
                    style={{ color, textShadow: `0 0 20px ${color}60` }}
                >
                    {displayScore}
                </motion.span>
                <span className="text-white/30 text-sm font-mono mt-0.5">%</span>

                <AnimatePresence mode="wait">
                    {delta !== 0 && (
                        <motion.div
                            key={`delta-${delta}`}
                            initial={{ opacity: 0, scale: 0.7, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.7, y: 6 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="mt-2 flex flex-col items-center"
                        >
                            <span className="text-lg font-black font-mono text-neon-green leading-none">
                                +{delta}%
                            </span>
                            <span className="text-neon-green/40 text-[9px] font-mono">from base</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {activeCount > 0 && (
                        <motion.span
                            key="count"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="mt-2 text-[10px] font-mono text-neon-green bg-neon-green/10 border border-neon-green/20 px-2 py-0.5 rounded-full"
                        >
                            {activeCount} applied
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Vertical liquid bar */}
            <div className="flex-1 flex flex-col items-center min-h-0">
                <span className="text-[9px] font-mono text-white/20 mb-1">100%</span>

                <div
                    className="flex-1 w-10 rounded-xl overflow-hidden border border-white/8 bg-white/3 min-h-0"
                    style={{ boxShadow: `0 0 20px ${color}25` }}
                >
                    <LiquidBar
                        fillPercent={currentScore}
                        color={color}
                        basePercent={baseScore}
                    />
                </div>

                <span className="text-[9px] font-mono text-white/20 mt-1">0%</span>
                <span className="text-[9px] font-mono text-white/15 mt-0.5">base {baseScore}%</span>
            </div>

            {/* Recalculating */}
            <AnimatePresence>
                {activeCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-white/5 overflow-hidden"
                    >
                        <div className="flex items-center gap-2 text-[10px] text-white/30">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                className="w-3 h-3 rounded-full border border-brand-400/50 border-t-brand-400 flex-shrink-0"
                            />
                            <span className="font-mono">Recalculating…</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
