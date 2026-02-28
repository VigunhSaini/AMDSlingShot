import { motion } from 'framer-motion';

export default function Header() {
    return (
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative z-20 w-full px-6 py-5 flex items-center justify-between"
        >
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-neon-cyan flex items-center justify-center shadow-glow-cyan">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-surface-950">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="absolute inset-0 rounded-lg bg-neon-cyan/30 blur-md -z-10" />
                </div>
                <div>
                    <span className="text-white font-bold text-base tracking-tight">PR Intelligence</span>
                    <span className="block text-white/30 text-xs font-mono mt-0.5">AI-Powered Merge Analysis</span>
                </div>
            </div>

            {/* Right badge */}
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-neon-green text-xs font-medium font-mono">AI Active</span>
                </div>
            </div>
        </motion.header>
    );
}
