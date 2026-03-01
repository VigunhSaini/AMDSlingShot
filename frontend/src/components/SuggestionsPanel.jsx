import { motion } from 'framer-motion';

// When inline=true, renders without the outer glass-card wrapper (for use inside the tab pane)
export default function SuggestionsPanel({ aiSuggestions = [], inline = false, onToggle }) {
    if (inline) {
        return (
            <div>
                <AISuggestionsList items={aiSuggestions} onToggle={onToggle} />
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
            <AISuggestionsList items={aiSuggestions} onToggle={onToggle} />
        </motion.div>
    );
}

function AISuggestionsList({ items, onToggle }) {
    if (!items || items.length === 0) {
        return (
            <p className="text-white/30 text-sm">No AI suggestions available yet.</p>
        );
    }
    
    return (
        <div className="flex flex-col gap-2.5">
            {items.map((item, i) => {
                const suggestionText = typeof item === 'string' ? item : item.text;
                const increase = typeof item === 'object' ? item.increase : 0;
                const isEnabled = typeof item === 'object' ? item.enabled : false;
                
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.06, duration: 0.35 }}
                        className={`flex gap-3 p-3 rounded-lg border transition-all duration-200 group cursor-pointer
                            ${isEnabled 
                                ? 'bg-neon-green/5 border-neon-green/30 hover:border-neon-green/40' 
                                : 'bg-white/3 border-white/6 hover:border-neon-purple/20'
                            }`}
                        onClick={() => onToggle && onToggle(i)}
                    >
                        {/* Custom checkbox */}
                        <div className="flex-shrink-0 mt-0.5">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
                                ${isEnabled 
                                    ? 'bg-neon-green border-neon-green' 
                                    : 'bg-white/5 border-white/20 group-hover:border-neon-purple/40'
                                }`}
                            >
                                {isEnabled && (
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                        <path 
                                            d="M2 6L5 9L10 3" 
                                            stroke="black" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed transition-colors duration-200
                                ${isEnabled ? 'text-white/90' : 'text-white/70'}`}>
                                {suggestionText}
                            </p>
                            {increase > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-xs font-mono font-bold transition-colors duration-200
                                        ${isEnabled ? 'text-neon-green' : 'text-white/40'}`}>
                                        +{increase}%
                                    </span>
                                    <span className="text-[10px] text-white/30">estimated increase</span>
                                </div>
                            )}
                        </div>
                        
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 transition-colors duration-200
                            ${isEnabled 
                                ? 'bg-neon-green/20 text-neon-green' 
                                : 'bg-neon-purple/15 text-neon-purple'
                            }`}>
                            {i + 1}
                        </span>
                    </motion.div>
                );
            })}
        </div>
    );
}
