import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SEVERITY_CONFIG = {
    high: { color: '#ff3860', bg: 'bg-neon-red/10', border: 'border-neon-red/20', label: 'HIGH' },
    medium: { color: '#ffb800', bg: 'bg-neon-amber/10', border: 'border-neon-amber/20', label: 'MED' },
    low: { color: '#00f5ff', bg: 'bg-brand-400/10', border: 'border-brand-400/20', label: 'LOW' },
};

function RiskItem({ factor, index, isPulsing }) {
    const [expanded, setExpanded] = useState(false);
    const config = SEVERITY_CONFIG[factor.severity];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
            <motion.div
                className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden transition-all duration-300`}
                animate={isPulsing ? {
                    boxShadow: [
                        `0 0 0px ${config.color}`,
                        `0 0 20px ${config.color}40`,
                        `0 0 0px ${config.color}`,
                    ],
                } : {}}
                transition={{ duration: 0.8 }}
            >
                {/* Header row */}
                <button
                    id={`risk-item-${factor.id}`}
                    onClick={() => setExpanded(e => !e)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left group"
                >
                    {/* Severity badge */}
                    <span
                        className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded"
                        style={{ color: config.color, backgroundColor: `${config.color}20` }}
                    >
                        {config.label}
                    </span>

                    {/* Label */}
                    <span className="flex-1 text-white/80 text-sm font-medium">{factor.label}</span>

                    {/* Impact */}
                    <span className="text-xs font-mono font-bold" style={{ color: config.color }}>
                        {factor.impact}%
                    </span>

                    {/* Chevron */}
                    <motion.div
                        animate={{ rotate: expanded ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-white/20 group-hover:text-white/40"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </motion.div>
                </button>

                {/* Impact bar */}
                <div className="px-4 pb-2">
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: config.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.abs(factor.impact) * 4}%` }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                    </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 pt-1 border-t border-white/5">
                                <p className="text-white/50 text-xs leading-relaxed mb-3">{factor.description}</p>
                                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/3 border border-white/5">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-neon-green flex-shrink-0 mt-0.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                    <p className="text-neon-green/70 text-xs leading-relaxed">{factor.suggestion}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

export default function RiskBreakdown({ factors, pulsingFactors = [] }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="glass-card p-6 h-full"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neon-red" />
                    <h2 className="text-white/70 text-xs font-medium uppercase tracking-widest">Risk Breakdown</h2>
                </div>
                <span className="text-white/20 text-xs font-mono">{factors.length} factors</span>
            </div>

            <div className="flex flex-col gap-2">
                {factors.map((factor, i) => (
                    <RiskItem
                        key={factor.id}
                        factor={factor}
                        index={i}
                        isPulsing={pulsingFactors.includes(factor.id)}
                    />
                ))}
            </div>
        </motion.div>
    );
}
