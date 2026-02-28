import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PRInputForm({ onAnalyze }) {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const btnRef = useRef(null);

    // Magnetic button effect
    const handleMouseMove = (e) => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
            setMousePos({ x: dx * 0.35, y: dy * 0.35 });
        } else {
            setMousePos({ x: 0, y: 0 });
        }
    };

    const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!url.trim() || isLoading) return;
        setIsLoading(true);
        // Simulate AI computation delay
        await new Promise(r => setTimeout(r, 1800));
        setIsLoading(false);
        onAnalyze(url);
    };

    const placeholderUrl = 'https://github.com/owner/repo/pull/123';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto"
        >
            {/* Title area */}
            <motion.div
                className="text-center mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
            >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                    <span className="text-brand-400 text-xs font-mono font-medium tracking-wider uppercase">Powered by ML + Behavioral Analysis</span>
                </div>
                <h1 className="text-5xl font-black leading-tight tracking-tight mb-4">
                    <span className="text-white">Predict Your</span>
                    <br />
                    <span className="text-gradient-cyan glow-text-cyan">Merge Probability</span>
                </h1>
                <p className="text-white/40 text-lg max-w-md mx-auto leading-relaxed">
                    AI analyzes 14 structural and behavioral factors to score your PR's likelihood of merging.
                </p>
            </motion.div>

            {/* Input form */}
            <form onSubmit={handleAnalyze} className="relative">
                <motion.div
                    className={`relative rounded-2xl transition-all duration-300 ${isFocused ? 'border-glow-cyan' : ''}`}
                >
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <motion.div
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                                animate={{ color: isFocused ? 'rgba(0,245,255,0.6)' : 'rgba(255,255,255,0.3)' }}
                                transition={{ duration: 0.2 }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </motion.div>
                            <input
                                id="pr-url-input"
                                type="url"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder={placeholderUrl}
                                className="input-field pl-10 pr-4 h-14 text-sm"
                                disabled={isLoading}
                                autoComplete="off"
                            />
                        </div>

                        {/* Magnetic CTA button */}
                        <motion.button
                            id="analyze-btn"
                            ref={btnRef}
                            type="submit"
                            disabled={isLoading || !url.trim()}
                            className="btn-primary h-14 px-7 whitespace-nowrap no-select"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            animate={{ x: mousePos.x, y: mousePos.y }}
                            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                            whileTap={{ scale: 0.96 }}
                        >
                            <AnimatePresence mode="wait">
                                {isLoading ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center gap-2"
                                    >
                                        {/* Scanning animation */}
                                        <div className="relative w-5 h-5">
                                            <div className="absolute inset-0 rounded-full border-2 border-surface-900/40 border-t-surface-950 animate-spin" />
                                        </div>
                                        <span className="font-bold text-sm">Analyzing…</span>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="idle"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-surface-950">
                                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
                                        </svg>
                                        <span className="font-bold">Analyze PR</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                </motion.div>

                {/* AI scanning overlay when loading */}
                <AnimatePresence>
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="mt-4 flex items-center justify-center gap-3 text-sm"
                        >
                            <div className="flex gap-1">
                                {[0, 1, 2, 3, 4].map(i => (
                                    <motion.div
                                        key={i}
                                        className="w-1 rounded-full bg-brand-400"
                                        animate={{ height: ['4px', '16px', '4px'] }}
                                        transition={{ duration: 0.8, delay: i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                                    />
                                ))}
                            </div>
                            <span className="text-brand-400/80 font-mono text-xs">
                                AI scanning structural patterns...
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Demo hint */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center text-white/20 text-xs mt-6 font-mono"
            >
                Try any GitHub PR URL · AI will simulate analysis
            </motion.p>
        </motion.div>
    );
}
