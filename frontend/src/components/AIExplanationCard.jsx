import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanAIText } from '../utils/parseAIText';



// Trim body text to at most N sentences for conciseness
function trimToSentences(text, max = 2) {
    // Split on sentence-ending punctuation followed by space + capital
    const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
    return parts.slice(0, max).join(' ').trim();
}

// Words that typically START a body sentence (not a heading continuation)
const BODY_STARTERS = new Set([
    'I', 'Your', 'You', 'This', 'The', 'It', 'We', 'There',
    'That', 'My', 'Our', 'They', 'He', 'She', 'One', 'Since',
    'As', 'While', 'Although', 'However', 'But', 'So', 'By',
]);

// Core split: given a paragraph like
//   "Hey Here's Where Your PR Stands Your PR is looking solid, but..."
// detect the boundary between the heading phrase and the body sentence.
//
// Strategy:
//   1. Markdown heading  →  ## Heading \n body
//   2. Bold heading      →  **Heading** body
//   3. Natural heading   →  scan word-by-word until we find a BODY_STARTER
//      word after at least 4 heading words, where the prev word ends cleanly.
function splitHeadingFromParagraph(text) {
    if (!text) return { heading: null, body: text };

    // 1. Markdown heading
    const mdMatch = text.match(/^#{1,6}\s+(.+)/);
    if (mdMatch) return { heading: mdMatch[1].trim(), body: '' };

    // 2. Bold-wrapped heading: **Title** rest of text
    const boldMatch = text.match(/^\*{1,2}([^*]+)\*{1,2}\s*([\s\S]*)/);
    if (boldMatch) return { heading: boldMatch[1].trim(), body: boldMatch[2].trim() };

    // 3. Natural heading scan
    const words = text.split(' ');
    if (words.length < 5) return { heading: null, body: text };

    const maxHeadingWords = Math.min(12, words.length - 1);
    let splitAt = -1;

    for (let i = 4; i < maxHeadingWords; i++) {   // heading must have ≥ 4 words
        const prev = words[i - 1];
        const curr = words[i];
        if (!curr) continue;

        const prevEndsClean = !/[,\-–—:]$/.test(prev);
        const prevEndsLower = /[a-z]/.test(prev.slice(-1));
        const currIsBodyStarter = BODY_STARTERS.has(curr);

        if (prevEndsClean && prevEndsLower && currIsBodyStarter) {
            splitAt = i;
            break;
        }
    }

    if (splitAt > 0) {
        const heading = words.slice(0, splitAt).join(' ').replace(/[.!?,;:]+$/, '').trim();
        const body = words.slice(splitAt).join(' ').trim();
        return { heading, body };
    }

    // No natural split found — treat whole paragraph as body
    return { heading: null, body: text };
}


// Parse cleaned AI text into { isHeading, text } sections
function parseSections(text) {
    if (!text) return [];

    // Split into paragraphs (double newlines), collapse single newlines
    const rawParagraphs = text
        .split(/\n{2,}/)
        .map(p => p.replace(/\n/g, ' ').trim())
        .filter(Boolean);

    const sections = [];

    for (const para of rawParagraphs) {
        const { heading, body } = splitHeadingFromParagraph(para);
        if (heading) {
            sections.push({ isHeading: true, text: heading });
        }
        if (body) {
            const concise = trimToSentences(body, 2);
            if (concise) sections.push({ isHeading: false, text: concise });
        }
    }

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
                                <div key={idx} className="flex items-center gap-2 mt-4 mb-1 first:mt-0">
                                    <div className="w-0.5 h-4 rounded-full bg-neon-purple flex-shrink-0" />
                                    <p className="text-neon-purple font-bold text-sm uppercase tracking-wide leading-snug">{s.text}</p>
                                </div>
                            ) : (
                                <p key={idx} className="text-white/70 text-sm leading-relaxed mb-3 pl-2.5">{s.text}</p>
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
