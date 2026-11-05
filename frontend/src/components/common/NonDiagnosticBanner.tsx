import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const NonDiagnosticBanner: React.FC = () => {
  return (
    <div className="bg-navy-900 border-b border-navy-750 px-4 py-2 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-slate-300 font-medium">Educational & Research Explorer:</strong> VariantLens is strictly for academic and computational research. Not validated for clinical diagnostic use or treatment decisions.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500 font-mono">
          <span>Ref: GRCh38</span>
          <span>•</span>
          <span>ClinVar 2024</span>
          <span>•</span>
          <span>gnomAD v4.1</span>
        </div>
      </div>
    </div>
  );
};
