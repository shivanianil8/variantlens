import React, { useState } from 'react';
import { Search, Sparkles, ArrowRight } from 'lucide-react';

interface VariantSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

export const VariantSearchBar: React.FC<VariantSearchBarProps> = ({
  onSearch,
  isLoading = false,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);

  const presets = [
    { label: 'BRAF V600E', desc: 'Melanoma & Kinase target' },
    { label: 'TP53 R175H', desc: 'Tumor suppressor hotspot' },
    { label: 'BRCA1 C61G', desc: 'RING domain missense' },
    { label: 'rs113488022', desc: 'dbSNP identifier' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSelectPreset = (pQuery: string) => {
    setQuery(pQuery);
    onSearch(pQuery);
  };

  return (
    <div className="w-full space-y-3">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute left-4 pointer-events-none text-slate-400">
          <Search className="w-5 h-5 text-accent-cyan" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by gene & protein change (e.g. BRAF V600E), HGVS (c.1799T>A), or rsID..."
          className="w-full pl-12 pr-28 py-3.5 bg-navy-900 border border-navy-700 hover:border-navy-600 focus:border-cyan-500 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 shadow-inner font-mono transition-all"
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Benchmark Presets */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Curated Benchmarks:</span>
        </div>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handleSelectPreset(preset.label)}
            className="px-2.5 py-1 rounded bg-navy-850 hover:bg-navy-800 text-slate-300 hover:text-cyan-300 border border-navy-750 hover:border-cyan-500/40 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
            title={preset.desc}
          >
            <span>{preset.label}</span>
            <span className="text-[10px] text-slate-400 font-sans">({preset.desc})</span>
          </button>
        ))}
      </div>
    </div>
  );
};
