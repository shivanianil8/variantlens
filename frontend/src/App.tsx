import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { NonDiagnosticBanner } from './components/common/NonDiagnosticBanner';
import { fetchHealth } from './services/api';
import { SystemHealth } from './types/variant';
import { Loader2 } from 'lucide-react';

// Lazy-loaded route page components for optimal bundle splitting
const OverviewPage = React.lazy(() =>
  import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const VariantExplorerPage = React.lazy(() =>
  import('./pages/VariantExplorerPage').then((m) => ({ default: m.VariantExplorerPage }))
);
const Protein3DPage = React.lazy(() =>
  import('./pages/Protein3DPage').then((m) => ({ default: m.Protein3DPage }))
);
const PredictionPage = React.lazy(() =>
  import('./pages/PredictionPage').then((m) => ({ default: m.PredictionPage }))
);
const EvidencePage = React.lazy(() =>
  import('./pages/EvidencePage').then((m) => ({ default: m.EvidencePage }))
);
const AboutModelPage = React.lazy(() =>
  import('./pages/AboutModelPage').then((m) => ({ default: m.AboutModelPage }))
);

const PageLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 space-y-3">
    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
    <span className="text-sm font-medium text-slate-300">Loading module...</span>
  </div>
);

export const App: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch((err) => {
        console.warn('API health check error:', err.message);
        setHealth(null);
      })
      .finally(() => setHealthLoading(false));
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
        <NonDiagnosticBanner />
        <Navbar health={health} healthLoading={healthLoading} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/explorer" element={<VariantExplorerPage />} />
              <Route path="/protein-3d" element={<Protein3DPage />} />
              <Route path="/prediction" element={<PredictionPage />} />
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/about-model" element={<AboutModelPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
