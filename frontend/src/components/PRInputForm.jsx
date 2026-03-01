import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SCAN_MESSAGES = [
    'Scanning structural patterns…',
    'Analyzing contributor signals…',
    'Computing behavioral graph…',
    'Evaluating merge probability…',
];

export default function PRInputForm({ appState, onScanStart, onScanComplete, error }) {
    const [url, setUrl] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [scanMsgIdx, setScanMsgIdx] = useState(0);
    const btnRef = useRef(null);
    const timerRef = useRef(null);

    const isScanning = appState === 'scanning' || appState === 'transitioning';
    const isTransitioning = appState === 'transitioning';
    const isLoading = appState === 'scanning' || appState === 'transitioning';

    // Cycle scan messages
    useEffect(() => {
        if (isScanning) {
            setScanMsgIdx(0);
            timerRef.current = setInterval(() => {
                setScanMsgIdx(i => (i + 1) % SCAN_MESSAGES.length);
            }, 420);
        }
        return () => clearInterval(timerRef.current);
    }, [isScanning]);

    // Magnetic button
    const handleMouseMove = (e) => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        setMousePos(dist < 80 ? { x: dx * 0.35, y: dy * 0.35 } : { x: 0, y: 0 });
    };
    const handleMouseLeave = () => setMousePos({ x: 0, y: 0 });

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!url.trim() || isLoading) return;
        onScanStart();
        // The actual API call happens in App.jsx via onScanComplete
        // which is now async — the scanning animation plays while it runs
        await onScanComplete(url);
    };

    const easeInOut = [0.4, 0, 0.2, 1];
    const slideTransition = { duration: 0.55, ease: easeInOut };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl mx-auto"
        >
            {/* ── HEADING AREA — SCENE 3 ────────────────────────────────────────── */}
            <div className="text-center mb-10">

                {/* Badge — in flow, fades out during scan */}
                <motion.div
                    animate={{ opacity: isScanning ? 0 : 1 }}
                    transition={{ duration: 0.3, ease: easeInOut }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-5"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                    <span className="text-brand-400 text-xs font-mono font-medium tracking-wider uppercase">
                        Powered by ML + Behavioral Analysis
                    </span>
                </motion.div>

                {/* Clip box — fixed height + overflow:hidden so slides clip cleanly */}
                <div className="relative" style={{ height: '148px', overflow: 'hidden' }}>

                    {/* Full heading — slides RIGHT out on scan */}
                    <motion.div
                        className="absolute inset-0 flex flex-col items-center justify-start pt-1"
                        animate={isScanning
                            ? { x: '115%', opacity: 0.4, transition: slideTransition }
                            : { x: '0%', opacity: 1, transition: slideTransition }
                        }
                    >
                        <h1 className="text-5xl font-black leading-tight tracking-tight">
                            <span className="text-white">Predict Your</span>
                            <br />
                            <span className="text-gradient-cyan glow-text-cyan">Merge Probability</span>
                        </h1>
                    </motion.div>

                    {/* Mini heading — slides in from LEFT on scan, splits + zooms out on transition */}
                    <motion.div
                        className="absolute inset-0 flex flex-col items-center justify-center"
                        animate={isScanning
                            ? { x: '0%', opacity: 1, transition: slideTransition }
                            : { x: '-115%', opacity: 0, transition: slideTransition }
                        }
                    >
                        {/* ── SCANNING: single unified PREDICT ── */}
                        {!isTransitioning && (
                            <div className="flex flex-col items-center">
                                <h1
                                    className="text-[72px] font-black text-gradient-cyan glow-text-cyan"
                                    style={{ letterSpacing: '0.3em', lineHeight: 1 }}
                                >
                                    PREDICT
                                </h1>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse inline-block" />
                                    <span className="text-brand-400/70 font-mono text-xs tracking-widest uppercase">Analysis Mode</span>
                                </div>
                            </div>
                        )}

                        {/* ── TRANSITIONING: split halves mount with initial y:0 → animate apart ── */}
                        {isTransitioning && (
                            <motion.div
                                className="flex flex-col items-center"
                                initial={{ scale: 1 }}
                                animate={{ scale: 0.72 }}
                                transition={{ duration: 0.45, ease: easeInOut }}
                            >
                                {/* Top half: flex-start keeps text top-aligned → overflow crops bottom half → we see top 36px */}
                                <div style={{ height: '36px', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                                    <motion.h1
                                        className="text-[72px] font-black text-gradient-cyan glow-text-cyan"
                                        style={{ letterSpacing: '0.3em', lineHeight: 1 }}
                                        initial={{ y: 0, opacity: 1 }}
                                        animate={{ y: '-100%', opacity: 0 }}
                                        transition={{ duration: 0.42, ease: easeInOut }}
                                    >
                                        PREDICT
                                    </motion.h1>
                                </div>
                                {/* Bottom half: flex-end pushes text bottom to container bottom → overflow crops top half → we see bottom 36px */}
                                <div style={{ height: '36px', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                    <motion.h1
                                        className="text-[72px] font-black text-gradient-cyan glow-text-cyan"
                                        style={{ letterSpacing: '0.3em', lineHeight: 1 }}
                                        initial={{ y: 0, opacity: 1 }}
                                        animate={{ y: '100%', opacity: 0 }}
                                        transition={{ duration: 0.42, ease: easeInOut }}
                                    >
                                        PREDICT
                                    </motion.h1>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                {/* Sub-text — in flow below clip box, fades + lifts on scan */}
                <motion.p
                    animate={{ opacity: isScanning ? 0 : 1, y: isScanning ? -6 : 0 }}
                    transition={{ duration: 0.35, ease: easeInOut }}
                    className="text-white/40 text-lg max-w-md mx-auto leading-relaxed mt-4"
                >
                    AI analyzes 14 structural and behavioral factors to score your PR's likelihood of merging.
                </motion.p>
            </div>

            {/* ── INPUT FORM — SCENE 2 & 4 ─────────────────────────────────────── */}
            <form onSubmit={handleAnalyze} className="relative">

                {/* Pulse glow behind input during scan */}
                <AnimatePresence>
                    {isScanning && (
                        <motion.div
                            key="input-glow"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 0.18, 0.08, 0.18, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            exit={{ opacity: 0 }}
                            className="absolute -inset-3 rounded-2xl pointer-events-none"
                            style={{
                                background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,245,255,0.25) 0%, transparent 70%)',
                                zIndex: -1,
                            }}
                        />
                    )}
                </AnimatePresence>

                <div className="flex gap-3">
                    {/* Input wrapper */}
                    <div className="relative flex-1">
                        <motion.div
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                            animate={{ color: isFocused ? 'rgba(0,245,255,0.6)' : isScanning ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.3)' }}
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
                            placeholder="https://github.com/owner/repo/pull/123"
                            className={`input-field pl-10 pr-4 h-14 text-sm transition-all duration-300 ${isScanning ? 'border-brand-400/30' : isFocused ? 'border-glow-cyan' : ''}`}
                            disabled={isLoading}
                            autoComplete="off"
                        />
                    </div>

                    {/* ── BUTTON — morphs into loader ────────────────────────── */}
                    <motion.button
                        id="analyze-btn"
                        ref={btnRef}
                        type="submit"
                        disabled={isLoading || !url.trim()}
                        className="btn-primary h-14 px-7 whitespace-nowrap no-select relative overflow-hidden min-w-[140px]"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        animate={{ x: mousePos.x, y: mousePos.y }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        whileTap={{ scale: 0.96 }}
                    >
                        {/* Idle label */}
                        <motion.div
                            key="idle-label"
                            animate={{
                                opacity: isLoading ? 0 : 1,
                                scale: isLoading ? 0.75 : 1,
                                y: isLoading ? -6 : 0,
                            }}
                            transition={{ duration: 0.28, ease: easeInOut }}
                            className="flex items-center gap-2 absolute inset-0 justify-center"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-surface-950">
                                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2" />
                            </svg>
                            <span className="font-bold">Analyze PR</span>
                        </motion.div>

                        {/* Loading label */}
                        <motion.div
                            key="loading-label"
                            animate={{
                                opacity: isLoading ? 1 : 0,
                                scale: isLoading ? 1 : 0.75,
                                y: isLoading ? 0 : 6,
                            }}
                            transition={{ duration: 0.28, ease: easeInOut }}
                            className="flex items-center gap-2 absolute inset-0 justify-center"
                        >
                            {/* Spinner */}
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                            </svg>
                            <span className="font-bold text-sm">Analyzing…</span>
                        </motion.div>
                    </motion.button>
                </div>

                {/* ── SCANNING BAR — SCENE 4 ──────────────────────────────────────── */}
                <AnimatePresence>
                    {isScanning && (
                        <motion.div
                            key="scan-bar"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.3, ease: easeInOut }}
                            className="mt-5"
                        >
                            {/* Message */}
                            <div className="flex items-center justify-center gap-3 mb-3">
                                {/* Waveform bars */}
                                <div className="flex gap-[3px] items-end h-4">
                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-[3px] rounded-full bg-brand-400"
                                            animate={{ height: ['4px', `${10 + Math.sin(i) * 8}px`, '4px'] }}
                                            transition={{
                                                duration: 0.7,
                                                delay: i * 0.09,
                                                repeat: Infinity,
                                                ease: 'easeInOut',
                                            }}
                                        />
                                    ))}
                                </div>
                                {/* Cycling message */}
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={scanMsgIdx}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.2, ease: easeInOut }}
                                        className="text-brand-400/80 font-mono text-xs tracking-wide"
                                    >
                                        {SCAN_MESSAGES[scanMsgIdx]}
                                    </motion.span>
                                </AnimatePresence>
                            </div>

                            {/* Scanning sweep line */}
                            <div className="relative h-[2px] rounded-full overflow-hidden bg-white/5">
                                <motion.div
                                    className="absolute top-0 h-full rounded-full"
                                    style={{
                                        width: '40%',
                                        background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.8), transparent)',
                                    }}
                                    animate={{ x: ['-40%', '280%'] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>

            {/* Error / Demo hint */}
            {error ? (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center"
                >
                    <p className="text-red-400 text-sm font-mono">{error}</p>
                </motion.div>
            ) : (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isScanning ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-center text-white/20 text-xs mt-6 font-mono"
                >
                    Try any GitHub PR URL · AI will analyze your PR
                </motion.p>
            )}
        </motion.div>
    );
}
