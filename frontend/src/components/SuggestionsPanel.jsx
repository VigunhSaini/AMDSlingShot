import { motion } from 'framer-motion';

// When inline=true, renders without the outer glass-card wrapper (for use inside the tab pane)
export default function SuggestionsPanel({ aiSuggestions = [], inline = false }) {
    if (inline) {
        return (
            <div>
                <AISuggestionsList items={aiSuggestions} />
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
                <div className="w-2 h-2 rounded-full bg-neon-purple" />
                <h2 className="text-white/70 text-xs font-medium uppercase tracking-widest">AI Recommendations</h2>
            </div>
            <AISuggestionsList items={aiSuggestions} />
        </motion.div>
    );
}

function AISuggestionsList({ items }) {
    if (!items || items.length === 0) {
        return (
            <p className="text-white/30 text-sm">No AI suggestions available yet.</p>
        );
    }
    return (
        <div className="flex flex-col gap-2.5">
            {items.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.06, duration: 0.35 }}
                    className="flex gap-3 p-3 rounded-lg bg-white/3 border border-white/6 hover:border-neon-purple/20 transition-colors duration-200"
                >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neon-purple/15 text-neon-purple text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                    </span>
                    <p className="text-white/80 text-sm leading-relaxed">{item}</p>
                </motion.div>
            ))}
        </div>
    );
}
