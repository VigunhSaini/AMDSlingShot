import { motion } from 'framer-motion';

export default function PRSummary({ data }) {
    const stats = [
        { label: 'Lines Added', value: `+${data.linesAdded}`, color: 'text-neon-green', icon: '+' },
        { label: 'Lines Removed', value: `-${data.linesRemoved}`, color: 'text-neon-red', icon: '−' },
        { label: 'Files Changed', value: data.filesChanged, color: 'text-brand-400', icon: '◈' },
        { label: 'Commits', value: data.commits, color: 'text-neon-amber', icon: '⬡' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="glass-card p-6 h-full"
        >
            <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-brand-400" />
                <h2 className="text-white/70 text-xs font-medium uppercase tracking-widest">PR Summary</h2>
            </div>

            {/* PR title */}
            <h3 className="text-white font-semibold text-sm leading-snug mb-4 line-clamp-2">
                {data.title}
            </h3>

            {/* Meta row */}
            <div className="flex flex-wrap gap-2 mb-5">
                <span className="tag bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    {data.author}
                </span>
                <span className="tag bg-white/5 text-white/40 border border-white/10">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2L12 22M2 12h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    {data.repo}
                </span>
                <span className="tag bg-white/5 text-white/40 border border-white/10">
                    ⏱ {data.createdAt}
                </span>
            </div>

            {/* Branch info */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5 mb-5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white/30 flex-shrink-0">
                    <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                    <circle cx="6" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                    <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                    <path d="M6 15V9a6 6 0 006 6h6" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="text-white/40 text-xs font-mono truncate">{data.branch}</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                        className="rounded-xl bg-white/3 border border-white/5 p-3"
                    >
                        <div className={`text-xl font-bold font-mono ${stat.color} leading-none mb-1`}>
                            {stat.value}
                        </div>
                        <div className="text-white/30 text-xs">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Reviewers */}
            <div className="mt-4 flex items-center gap-2">
                <span className="text-white/30 text-xs">Reviewers:</span>
                <div className="flex gap-1.5">
                    {data.reviewers.map((r, i) => (
                        <motion.div
                            key={r}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.6 + i * 0.08 }}
                            className="w-6 h-6 rounded-full bg-surface-600 border border-white/10 flex items-center justify-center text-[9px] text-white/60 font-bold uppercase"
                            title={r}
                        >
                            {r.slice(0, 2)}
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
