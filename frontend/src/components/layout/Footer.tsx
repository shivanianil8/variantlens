import React from 'react';
import { Database, ShieldCheck, ExternalLink, Cpu } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-navy-800 bg-navy-950/90 text-slate-400 text-xs py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scientific Disclaimer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-accent-cyan" />
              <span>Scientific & Educational Disclaimer</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              VariantLens is built for computational genomics research and bioinformatics education.
              Predictions and annotations represent statistical research hypotheses and must not be used as clinical diagnostic guidance.
            </p>
          </div>

          {/* Biological Data Provenance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Database className="w-4 h-4 text-accent-teal" />
              <span>Data Provenance & APIs</span>
            </div>
            <ul className="space-y-1 text-slate-400 text-xs">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>NCBI ClinVar (High-Confidence Missense SNVs)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>gnomAD v4.1 (Exome Population Frequencies)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>UniProtKB & AlphaFold Protein Structure DB</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>NCBI Entrez E-utilities (PubMed Literature)</span>
              </li>
            </ul>
          </div>

          {/* Methodological Transparency */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Cpu className="w-4 h-4 text-accent-sky" />
              <span>Model Rigor & Leakage Prevention</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Trained exclusively via gene-held-out GroupKFold to prevent homologous leakage. No clinical submitter counts or review stars are ever used as predictive input features.
            </p>
          </div>
        </div>

        <div className="border-t border-navy-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            <span>VariantLens Computational Platform © {new Date().getFullYear()} • MIT Research License</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.ncbi.nlm.nih.gov/clinvar/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>ClinVar Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://alphafold.ebi.ac.uk/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>AlphaFold DB</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://gnomad.broadinstitute.org/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>gnomAD</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
