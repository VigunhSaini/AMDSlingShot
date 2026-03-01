import { useState, useRef, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import ProbabilityHero from './ProbabilityHero';
import PRSummary from './PRSummary';
import RiskBreakdown from './RiskBreakdown';
import SuggestionsPanel from './SuggestionsPanel';
import SimulationPanel from './SimulationPanel';
import AIExplanationCard from './AIExplanationCard';
import { computeProbability } from '../data/mockData';
import { extractAISuggestions } from '../utils/parseAIText';

// Parallax tilt card
function TiltCard({ children, className = '' }) {
    const cardRef = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-80, 80], [2, -2]);
    const rotateY = useTransform(x, [-80, 80], [-2, 2]);
    const handleMouseMove = (e) => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
    };
    const handleMouseLeave = () => { x.set(0); y.set(0); };
    return (
        <motion.div
            ref={cardRef}
            style={{ rotateX, rotateY, transformPerspective: 1200 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`${className} h-full`}
        >
            {children}
        </motion.div>
    );
}

const TABS = [
    { id: 'summary', label: 'PR Summary', icon: '◈' },
    { id: 'risk', label: 'Risk Breakdown', icon: '⚠' },
    { id: 'suggestions', label: 'Suggestions', icon: '✦' },
];

export default function AnalysisDashboard({ prUrl, data }) {
    const [activeTab, setActiveTab] = useState('summary');

    const currentScore = computeProbability(data?.baseProbability || 50, {});
    const explanation = data?.aiExplanation || '';
    const aiSuggestions = useMemo(() => extractAISuggestions(explanation), [explanation]);

    if (!data) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-7xl mx-auto px-6 pb-16 flex flex-col gap-6"
        >
            {/* PR badge */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 self-center"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neon-green flex-shrink-0">
                    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-white/50 text-sm font-mono truncate max-w-lg">{prUrl || data.repo}</span>
            </motion.div>

            {/* ─── ROW 1: AI Analysis (wide) + Probability Circle (right) ─── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                className="glass-card p-8 flex items-center gap-8"
            >
                {/* AI Analysis – takes most of the width */}
                <div className="flex-1 min-w-0">
                    <AIExplanationCard explanation={explanation} />
                </div>

                {/* Divider */}
                <div className="w-px self-stretch bg-white/8 flex-shrink-0" />

                {/* Probability circle – right side */}
                <div className="flex-shrink-0 flex items-center justify-center px-4">
                    <ProbabilityHero score={data.baseProbability} simulatedScore={currentScore} />
                </div>
            </motion.div>

            {/* ─── ROW 2: Tabbed Panel (left) + Live Sim (narrow right sidebar) ─── */}
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}
            >
                {/* Tabbed panel */}
                <TiltCard className="min-w-0">
                    <div className="glass-card overflow-hidden h-full flex flex-col">
                        {/* Tab bar */}
                        <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/2">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        id={`tab-${tab.id}`}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${isActive ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="tab-active-bg"
                                                className="absolute inset-0 rounded-lg bg-white/8 border border-white/10"
                                                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                            />
                                        )}
                                        <span className="relative z-10 text-sm">{tab.icon}</span>
                                        <span className="relative z-10">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab content */}
                        <div className="flex-1 min-h-[420px]">
                            <AnimatePresence mode="wait">
                                {activeTab === 'summary' && (
                                    <motion.div
                                        key="summary"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-6"
                                    >
                                        {/* Inlined PR summary content (no outer glass-card) */}
                                        <PRSummaryInline data={data} />
                                    </motion.div>
                                )}
                                {activeTab === 'risk' && (
                                    <motion.div
                                        key="risk"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-6"
                                    >
                                        <RiskBreakdownInline factors={data.riskFactors} pulsingFactors={[]} />
                                    </motion.div>
                                )}
                                {activeTab === 'suggestions' && (
                                    <motion.div
                                        key="suggestions"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="p-6"
                                    >
                                        <SuggestionsPanel
                                            aiSuggestions={aiSuggestions}
                                            inline
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </TiltCard>

                {/* Live Simulation sidebar */}
                <div style={{ height: '500px' }}>
                    <SimulationPanel
                        currentScore={currentScore}
                        baseScore={data.baseProbability}
                        activeToggles={{}}
                    />
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ─── Inline versions (no wrapping glass-card, rendered inside the tab pane) ─── */

function PRSummaryInline({ data }) {
    const stats = [
        { label: 'Lines Added', value: `+${data.linesAdded}`, color: 'text-neon-green' },
        { label: 'Lines Removed', value: `-${data.linesRemoved}`, color: 'text-neon-red' },
        { label: 'Files Changed', value: data.filesChanged, color: 'text-brand-400' },
        { label: 'Commits', value: data.commits, color: 'text-neon-amber' },
    ];
    return (
        <div>
            <h3 className="text-white font-semibold text-lg leading-snug mb-5 line-clamp-2">{data.title}</h3>
            <div className="flex flex-wrap gap-2.5 mb-5">
                <span className="tag text-sm bg-brand-500/10 text-brand-400 border border-brand-500/20 px-3 py-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    {data.author}
                </span>
                <span className="tag text-sm bg-white/5 text-white/40 border border-white/10 px-3 py-1">{data.repo}</span>
                <span className="tag text-sm bg-white/5 text-white/40 border border-white/10 px-3 py-1">⏱ {data.createdAt}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/3 border border-white/5 mb-5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white/30 flex-shrink-0"><circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" /><circle cx="6" cy="19" r="3" stroke="currentColor" strokeWidth="2" /><circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" /><path d="M6 15V9a6 6 0 006 6h6" stroke="currentColor" strokeWidth="2" /></svg>
                <span className="text-white/40 text-sm font-mono truncate">{data.branch}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {stats.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        className="rounded-xl bg-white/3 border border-white/5 p-4">
                        <div className={`text-2xl font-bold font-mono ${s.color} leading-none mb-1.5`}>{s.value}</div>
                        <div className="text-white/30 text-sm">{s.label}</div>
                    </motion.div>
                ))}
            </div>
            <div className="flex items-center gap-3">
                <span className="text-white/30 text-sm">Reviewers:</span>
                <div className="flex gap-2">
                    {data.reviewers.map((r, i) => (
                        <motion.div key={r} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.07 }}
                            className="w-8 h-8 rounded-full bg-surface-600 border border-white/10 flex items-center justify-center text-xs text-white/60 font-bold uppercase" title={r}>
                            {r.slice(0, 2)}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function RiskBreakdownInline({ factors, pulsingFactors = [] }) {
    const [expanded, setExpanded] = useState(null);
    const SEVERITY_CONFIG = {
        high: { color: '#ff3860', label: 'HIGH' },
        medium: { color: '#ffb800', label: 'MED' },
        low: { color: '#00f5ff', label: 'LOW' },
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
                <span className="text-white/30 text-sm">{factors.length} risk factors detected</span>
            </div>
            {factors.map((factor, i) => {
                const cfg = SEVERITY_CONFIG[factor.severity];
                const isOpen = expanded === factor.id;
                const isPulsing = pulsingFactors.includes(factor.id);
                return (
                    <motion.div
                        key={factor.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-xl border overflow-hidden"
                        style={{
                            borderColor: `${cfg.color}30`,
                            backgroundColor: `${cfg.color}0a`,
                            boxShadow: isPulsing ? `0 0 16px ${cfg.color}50` : 'none',
                            transition: 'box-shadow 0.6s ease',
                        }}
                    >
                        <button onClick={() => setExpanded(isOpen ? null : factor.id)}
                            className="w-full flex items-center gap-3 px-5 py-4 text-left group">
                            <span className="text-xs font-bold font-mono px-2 py-1 rounded"
                                style={{ color: cfg.color, backgroundColor: `${cfg.color}20` }}>{cfg.label}</span>
                            <span className="flex-1 text-white/80 text-base font-medium">{factor.label}</span>
                            <span className="text-xs font-mono font-bold" style={{ color: cfg.color }}>{factor.impact}%</span>
                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-white/20">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </motion.div>
                        </button>
                        <div className="px-4 pb-2">
                            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{ backgroundColor: cfg.color }}
                                    initial={{ width: 0 }} animate={{ width: `${Math.abs(factor.impact) * 4}%` }}
                                    transition={{ delay: i * 0.06 + 0.2, duration: 0.7 }} />
                            </div>
                        </div>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                                        <p className="text-white/50 text-sm leading-relaxed mb-3">{factor.description}</p>
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neon-green flex-shrink-0 mt-0.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" /><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                            <p className="text-neon-green/70 text-sm leading-relaxed">{factor.suggestion}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
}
