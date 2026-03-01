import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AnimatedBackground from './components/AnimatedBackground';
import Header from './components/Header';
import PRInputForm from './components/PRInputForm';
import AnalysisDashboard from './components/AnalysisDashboard';
import { analyzePR } from './services/api';

// appState machine: idle → scanning → transitioning → dashboard
export default function App() {
  const [appState, setAppState] = useState('idle'); // 'idle' | 'scanning' | 'transitioning' | 'dashboard' | 'error'
  const [analyzedUrl, setAnalyzedUrl] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Called by PRInputForm when the form is submitted
  const handleScanStart = useCallback(() => {
    setAnalysisError(null);
    setAppState('scanning');
  }, []);

  // Called by PRInputForm — triggers the real API call
  const handleScanComplete = useCallback(async (url) => {
    try {
      const data = await analyzePR(url);
      setAnalysisData(data);
      setAnalyzedUrl(url);
      setAppState('transitioning');
    } catch (err) {
      console.error('[App] Analysis failed:', err);
      setAnalysisError(err.message || 'Analysis failed. Please try again.');
      setAppState('idle');
    }
  }, []);

  // After the collapse animation fires, promote to 'dashboard'
  useEffect(() => {
    if (appState === 'transitioning') {
      const t = setTimeout(() => setAppState('dashboard'), 650); // matches collapse duration
      return () => clearTimeout(t);
    }
  }, [appState]);

  const handleReset = useCallback(() => {
    setAppState('idle');
    setAnalyzedUrl(null);
    setAnalysisData(null);
    setAnalysisError(null);
  }, []);

  const isScanning = appState === 'scanning';
  const isTransitioning = appState === 'transitioning';
  const isDashboard = appState === 'dashboard';
  const showLanding = appState === 'idle' || appState === 'scanning' || appState === 'transitioning';
  const showDashboard = appState === 'transitioning' || appState === 'dashboard';

  // Collapse variant for landing
  const landingExitVariant = {
    scale: 0.86,
    opacity: 0,
    filter: 'blur(10px)',
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fixed neural background — always present, intensity-aware */}
      <AnimatedBackground isScanning={isScanning} />

      {/* ── DASHBOARD LAYER — sits behind, scales in ───────────────────── */}
      <AnimatePresence>
        {showDashboard && analyzedUrl && analysisData && (
          <motion.div
            key="dashboard-layer"
            className="fixed inset-0 z-10 overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95, y: 40, filter: 'blur(8px)' }}
            animate={isDashboard
              ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, scale: 0.95, y: 40, filter: 'blur(8px)' }
            }
            transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="relative z-10 flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 pt-4">
                <div className="px-4 mb-6 max-w-7xl mx-auto">
                  <motion.button
                    id="analyze-another-btn"
                    onClick={handleReset}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isDashboard ? 1 : 0, x: isDashboard ? 0 : -10 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm font-mono transition-colors duration-200 group"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
                    Analyze another PR
                  </motion.button>
                </div>
                <AnalysisDashboard prUrl={analyzedUrl} data={analysisData} />
              </main>
              <footer className="py-4 text-center">
                <p className="text-white/15 text-xs font-mono">
                  PR Intelligence · Powered by behavioral ML models
                </p>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LANDING LAYER — sits on top, collapses away ─────────────────── */}
      <AnimatePresence>
        {showLanding && (
          <motion.div
            key="landing-layer"
            className="relative z-20 flex flex-col min-h-screen"
            exit={landingExitVariant}
          >
            <Header />
            <main className="flex-1 flex items-center justify-center px-4 py-12">
              <PRInputForm
                appState={appState}
                onScanStart={handleScanStart}
                onScanComplete={handleScanComplete}
                error={analysisError}
              />
            </main>
            <footer className="py-4 text-center">
              <p className="text-white/15 text-xs font-mono">
                PR Intelligence · Powered by behavioral ML models
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
