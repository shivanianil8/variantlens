import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Info, ExternalLink, Sliders } from 'lucide-react';

export const Protein3DPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const uniprot = searchParams.get('uniprot') || 'P15056';
  const pos = searchParams.get('pos') || '600';
  const wt = searchParams.get('wt') || 'V';
  const mut = searchParams.get('mut') || 'E';

  const [activeTab, setActiveTab] = useState<'cartoon' | 'surface' | 'contacts'>('cartoon');

  const plddtBands = [
    { label: 'Very High (pLDDT > 90)', color: 'bg-[#0C53B7]', desc: 'High accuracy, suitable for side-chain coordination analysis' },
    { label: 'Confident (90 > pLDDT > 70)', color: 'bg-[#5BC0DE]', desc: 'Reliable backbone fold' },
    { label: 'Low (70 > pLDDT > 50)', color: 'bg-[#F0AD4E]', desc: 'Potential flexible loop or disordered region' },
    { label: 'Very Low (pLDDT < 50)', color: 'bg-[#D9534F]', desc: 'Unstructured or intrinsically disordered region' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Box className="w-7 h-7 text-accent-cyan" />
            <span>3D Protein Structural Viewer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AlphaFold predicted coordinates with residue-level pLDDT confidence color-mapping
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-3 py-1.5 rounded-lg border border-cyan-800/60">
            UniProt: {uniprot}
          </span>
          <a
            href={`https://alphafold.ebi.ac.uk/entry/${uniprot}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-300 hover:text-white bg-navy-850 hover:bg-navy-800 px-3 py-1.5 rounded-lg border border-navy-750 flex items-center gap-1.5 transition-colors"
          >
            <span>AlphaFold DB</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Structural Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Controls & Residue Context */}
        <div className="space-y-5 lg:col-span-1">
          {/* Active Residue Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Target Substitution</span>
            </h3>

            <div className="bg-navy-950 p-4 rounded-lg border border-navy-800 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <span className="text-xl font-bold font-mono text-cyan-400 bg-cyan-950/80 w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-800/80">
                  {wt}
                </span>
                <span className="text-slate-500 font-mono text-xs">→</span>
                <span className="text-xl font-bold font-mono text-rose-400 bg-rose-950/80 w-10 h-10 rounded-lg flex items-center justify-center border border-rose-800/80">
                  {mut}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-300 block font-medium">
                Position #{pos}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {wt} (Wild Type) to {mut} (Mutant)
              </span>
            </div>

            <div className="space-y-2 text-xs pt-2">
              <div className="flex justify-between py-1 border-b border-navy-800/80">
                <span className="text-slate-400">Structure Source:</span>
                <span className="text-slate-200 font-mono">AlphaFold v4</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800/80">
                <span className="text-slate-400">Local pLDDT:</span>
                <span className="text-emerald-400 font-mono font-medium">94.2 (Very High)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800/80">
                <span className="text-slate-400">Secondary Structure:</span>
                <span className="text-slate-200 font-mono">Alpha Helix (Kinase Loop)</span>
              </div>
            </div>
          </div>

          {/* pLDDT Legend */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-accent-teal" />
              <span>pLDDT Confidence Scale</span>
            </h3>

            <div className="space-y-2 text-xs">
              {plddtBands.map((band) => (
                <div key={band.label} className="flex items-start gap-2.5">
                  <span className={`w-3 h-3 rounded mt-0.5 shrink-0 ${band.color}`} />
                  <div>
                    <span className="text-slate-200 font-medium block text-[11px]">{band.label}</span>
                    <span className="text-slate-400 text-[10px] leading-tight block">{band.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: 3D Mol* Structural Canvas Container */}
        <div className="lg:col-span-3 bg-navy-900 border border-navy-800 rounded-xl overflow-hidden flex flex-col min-h-[520px] shadow-2xl relative">
          {/* Top Canvas Bar */}
          <div className="bg-navy-950 px-4 py-3 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-mono text-slate-300">
                AF-{uniprot}-F1-model_v4 • Residue {pos}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('cartoon')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeTab === 'cartoon' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cartoon
              </button>
              <button
                onClick={() => setActiveTab('surface')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeTab === 'surface' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Surface
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  activeTab === 'contacts' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400 hover:text-white'
                }`}
              >
                Polar Contacts
              </button>
            </div>
          </div>

          {/* WebGL Canvas Container */}
          <div className="flex-1 bg-gradient-to-b from-[#070C18] to-[#0B1120] flex flex-col items-center justify-center p-8 text-center relative group">
            {/* Visual biological structure schematic */}
            <div className="w-32 h-32 rounded-full border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-center relative mb-4 shadow-2xl shadow-cyan-950">
              <div className="w-20 h-20 rounded-full border border-teal-500/40 bg-teal-950/30 flex items-center justify-center">
                <Box className="w-10 h-10 text-accent-cyan animate-pulse" />
              </div>
              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-mono">
                {wt}{pos}{mut}
              </div>
            </div>

            <h4 className="text-base font-semibold text-white">
              AlphaFold Model Coordinates Ready
            </h4>
            <p className="max-w-md text-xs text-slate-400 mt-2 leading-relaxed">
              Residue position <strong className="text-cyan-400 font-mono">#{pos}</strong> in UniProt <strong className="text-slate-200 font-mono">{uniprot}</strong> mapped to AlphaFold coordinate file <code className="text-slate-300 bg-navy-800 px-1 py-0.5 rounded font-mono text-[10px]">AF-{uniprot}-F1-model_v4.cif</code>.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={`https://alphafold.ebi.ac.uk/files/AF-${uniprot}-F1-model_v4.pdb`}
                download
                className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 text-xs font-mono transition-colors"
              >
                Download PDB Coordinates
              </a>
              <a
                href={`https://alphafold.ebi.ac.uk/files/AF-${uniprot}-F1-model_v4.cif`}
                download
                className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-colors"
              >
                Download mmCIF
              </a>
            </div>

            {/* Scientific annotation footer in canvas */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Viewer: Mol* WebGL Component (Phase 5)</span>
              <span>Coordinate Frame: Canonical UniProt Isoform</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
