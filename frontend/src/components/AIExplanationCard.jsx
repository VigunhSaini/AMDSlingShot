import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanAIText } from '../utils/parseAIText';



// Parse text into sections upfront, then reveal progressively
function parseSections(text) {
    if (!text) return [];
    const sections = [];
    const lines = text.split('\n');
    let bodyLines = [];

    const flushBody = () => {
        const joined = bodyLines.join(' ').trim();
        if (joined) sections.push({ isHeading: false, text: joined });
        bodyLines = [];
    };

    for (const line of lines) {
        const headingMatch = line.match(/^\s*#{1,6}\s+(.+)/);
        if (headingMatch) {
            flushBody();
            const h = headingMatch[1].trim();
            if (h) sections.push({ isHeading: true, text: h });
        } else {
            const trimmed = line.trim();
            if (trimmed === '') {
                flushBody();
            } else {
                bodyLines.push(trimmed);
            }
        }
    }
    flushBody();
    return sections;
}

export default function AIExplanationCard({ explanation }) {
    const cleaned = useMemo(() => cleanAIText(explanation), [explanation]);
    const sections = useMemo(() => parseSections(cleaned), [cleaned]);
    const [visibleCount, setVisibleCount] = useState(0);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!sections.length) return;
        setVisibleCount(0);
        setIsTyping(true);
        let i = 0;
        // Reveal one section every ~120ms
        const interval = setInterval(() => {
            i++;
            setVisibleCount(i);
            if (i >= sections.length) {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 120);
        return () => clearInterval(interval);
    }, [sections]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            className="relative glass-card p-5 overflow-hidden"
        >
            {/* Glow accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-neon-purple/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3">
                {/* AI brain icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neon-purple">
                        <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26A7 7 0 0112 2z" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M9 21h6M10 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-neon-purple text-xs font-bold uppercase tracking-wider">AI Analysis</span>
                        <AnimatePresence>
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex gap-0.5"
                                >
                                    {[0, 1, 2].map(i => (
                                        <motion.div
                                            key={i}
                                            className="w-1 h-1 rounded-full bg-neon-purple/60"
                                            animate={{ opacity: [0.3, 1, 0.3] }}
                                            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                        {sections.slice(0, visibleCount).map((s, idx) =>
                            s.isHeading ? (
                                <p key={idx} className="text-white font-extrabold text-base mt-4 mb-2 first:mt-0" style={{ textShadow: '0 0 8px rgba(255, 255, 255, 0.3)' }}>{s.text}</p>
                            ) : (
                                <p key={idx} className="text-white text-sm leading-relaxed mb-3" style={{ textShadow: '0 0 6px rgba(255, 255, 255, 0.15)' }}>{s.text}</p>
                            )
                        )}
                        {isTyping && (
                            <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="inline-block w-0.5 h-4 bg-neon-purple ml-0.5 align-middle"
                            />
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
