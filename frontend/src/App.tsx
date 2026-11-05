import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { NonDiagnosticBanner } from './components/common/NonDiagnosticBanner';
import { OverviewPage } from './pages/OverviewPage';
import { VariantExplorerPage } from './pages/VariantExplorerPage';
import { Protein3DPage } from './pages/Protein3DPage';
import { PredictionPage } from './pages/PredictionPage';
import { EvidencePage } from './pages/EvidencePage';
import { AboutModelPage } from './pages/AboutModelPage';
import { fetchHealth } from './services/api';
import { SystemHealth } from './types/variant';

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
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/explorer" element={<VariantExplorerPage />} />
            <Route path="/protein-3d" element={<Protein3DPage />} />
            <Route path="/prediction" element={<PredictionPage />} />
            <Route path="/evidence" element={<EvidencePage />} />
            <Route path="/about-model" element={<AboutModelPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
