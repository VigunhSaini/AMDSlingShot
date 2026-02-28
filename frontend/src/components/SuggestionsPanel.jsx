import { motion } from 'framer-motion';

const EFFORT_COLORS = {
    green: { text: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/20' },
    amber: { text: 'text-neon-amber', bg: 'bg-neon-amber/10', border: 'border-neon-amber/20' },
    red: { text: 'text-neon-red', bg: 'bg-neon-red/10', border: 'border-neon-red/20' },
};

function TogglesList({ suggestions, activeToggles, onToggle }) {
    return (
        <div className="flex flex-col gap-3">
            {suggestions.map((s, i) => {
                const isActive = activeToggles[s.id] || false;
                const effort = EFFORT_COLORS[s.effortColor] || EFFORT_COLORS.amber;
                return (
                    <motion.button
                        id={`suggestion-toggle-${s.id}`}
                        key={s.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                        onClick={() => onToggle(s.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all duration-300 group
              ${isActive
                                ? 'bg-neon-green/8 border-neon-green/30 shadow-glow-green'
                                : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'
                            }`}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-start gap-3">
                            {/* Toggle circle */}
                            <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                ${isActive ? 'border-neon-green bg-neon-green' : 'border-white/20 bg-transparent group-hover:border-white/40'}`}>
                                <motion.div
                                    initial={false}
                                    animate={{ scale: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-surface-950">
                                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </motion.div>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={`text-sm font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/70'}`}>
                                        {s.label}
                                    </span>
                                    <motion.span
                                        animate={{ scale: isActive ? [1, 1.2, 1] : 1 }}
                                        transition={{ duration: 0.4 }}
                                        className="text-xs font-bold font-mono text-neon-green"
                                    >
                                        +{s.delta}%
                                    </motion.span>
                                </div>
                                <p className="text-white/30 text-xs leading-relaxed">{s.description}</p>
                                <div className="mt-2 flex items-center gap-1.5">
                                    <span className="text-white/20 text-[10px]">Effort:</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${effort.text} ${effort.bg} border ${effort.border}`}>
                                        {s.effort}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}

// When inline=true, renders without the outer glass-card wrapper (for use inside the tab pane)
export default function SuggestionsPanel({ suggestions, activeToggles, onToggle, inline = false }) {
    if (inline) {
        return (
            <div>
                <p className="text-white/30 text-xs mb-4 leading-relaxed">
                    Toggle improvements to simulate their impact on merge probability.
                </p>
                <TogglesList suggestions={suggestions} activeToggles={activeToggles} onToggle={onToggle} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="glass-card p-6 h-full"
        >
            <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-neon-green" />
                <h2 className="text-white/70 text-xs font-medium uppercase tracking-widest">Suggestions</h2>
            </div>
            <p className="text-white/30 text-xs mb-5 leading-relaxed">
                Toggle improvements to simulate their impact on merge probability.
            </p>
            <TogglesList suggestions={suggestions} activeToggles={activeToggles} onToggle={onToggle} />
        </motion.div>
    );
}
