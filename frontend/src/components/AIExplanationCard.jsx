import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIExplanationCard({ explanation }) {
    const [displayed, setDisplayed] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        if (!explanation) return;
        setDisplayed('');
        setIsTyping(true);
        let i = 0;
        const speed = 18; // ms per character
        const interval = setInterval(() => {
            if (i < explanation.length) {
                setDisplayed(explanation.slice(0, i + 1));
                i++;
            } else {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [explanation]);

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

                    <p className="text-white/60 text-sm leading-relaxed font-mono">
                        {displayed}
                        {isTyping && (
                            <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                                className="inline-block w-0.5 h-4 bg-neon-purple ml-0.5 align-middle"
                            />
                        )}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
