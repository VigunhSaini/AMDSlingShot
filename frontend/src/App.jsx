import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedBackground from './components/AnimatedBackground';
import Header from './components/Header';
import PRInputForm from './components/PRInputForm';
import AnalysisDashboard from './components/AnalysisDashboard';

export default function App() {
  const [analyzedUrl, setAnalyzedUrl] = useState(null);

  const handleAnalyze = (url) => {
    setAnalyzedUrl(url);
  };

  const handleReset = () => {
    setAnalyzedUrl(null);
  };

  return (
    <div className="relative min-h-screen">
      <AnimatedBackground />

      {/* Scrollable content layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <AnimatePresence mode="wait">
          {!analyzedUrl ? (
            <motion.main
              key="entry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex items-center justify-center px-4 py-12"
            >
              <PRInputForm onAnalyze={handleAnalyze} />
            </motion.main>
          ) : (
            <motion.main
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 pt-4"
            >
              {/* Back button */}
              <div className="px-4 mb-6 max-w-7xl mx-auto">
                <motion.button
                  id="analyze-another-btn"
                  onClick={handleReset}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm font-mono transition-colors duration-200 group"
                >
                  <motion.span
                    className="group-hover:-translate-x-1 transition-transform duration-200"
                  >←</motion.span>
                  Analyze another PR
                </motion.button>
              </div>

              <AnalysisDashboard prUrl={analyzedUrl} />
            </motion.main>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="relative z-10 py-4 text-center">
          <p className="text-white/15 text-xs font-mono">
            PR Intelligence · Powered by behavioral ML models
          </p>
        </footer>
      </div>
    </div>
  );
}
