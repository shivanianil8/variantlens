import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dna,
  ShieldAlert,
  Search,
  Box,
  BrainCircuit,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  GitBranch
} from 'lucide-react';
import { VariantSearchBar } from '../components/search/VariantSearchBar';
import { ClinicalBadge } from '../components/common/ClinicalBadge';
import { fetchBenchmarks } from '../services/api';
import { VariantAnnotationResponse } from '../types/variant';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [benchmarks, setBenchmarks] = useState<VariantAnnotationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmarks()
      .then(setBenchmarks)
      .catch((err) => console.error("Error loading benchmarks:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (query: string) => {
    navigate(`/explorer?q=${encodeURIComponent(query)}`);
  };

  const featureCards = [
    {
      title: 'Variant Explorer',
      desc: 'Investigate clinical assertions from NCBI ClinVar alongside multi-population allele frequencies from gnomAD v4.1.',
      icon: Search,
      to: '/explorer',
      tag: 'Clinical Consensus'
    },
    {
      title: '3D Protein Viewer',
      desc: 'Pinpoint mutated amino acids in interactive AlphaFold structures colored by residue-level pLDDT confidence.',
      icon: Box,
      to: '/protein-3d',
      tag: 'Structural Biology'
    },
    {
      title: 'Prediction & Explainability',
      desc: 'Transparent ML pathogenicity scoring with TreeSHAP feature attributions, strictly partitioned from ClinVar clinical gold standards.',
      icon: BrainCircuit,
      to: '/prediction',
      tag: 'TreeSHAP'
    },
    {
      title: 'Evidence & Literature',
      desc: 'Direct bibliographic integration with NCBI E-utilities (PubMed) and submitter assertions.',
      icon: BookOpen,
      to: '/evidence',
      tag: 'Provenance'
    },
  ];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-10 border-b border-navy-800">
        <div className="max-w-5xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-850 border border-cyan-500/30 text-xs text-cyan-300 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Explainable Bioinformatics & Variant Pathogenicity Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            Decipher Genetic Variants with <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
              Structural & Explainable Precision
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
            VariantLens bridges clinical annotations from ClinVar, population genetics from gnomAD,
            3D protein folds from AlphaFold, and leak-free machine learning with SHAP feature attributions.
          </p>

          {/* Search Box in Hero */}
          <div className="pt-4 max-w-3xl mx-auto text-left">
            <VariantSearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Curated Benchmark Variant Cards */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Dna className="w-5 h-5 text-accent-cyan" />
              <span>Curated Benchmark Variants</span>
            </h2>
            <p className="text-xs text-slate-400">
              Gold-standard clinically verified variants with documented biological provenance
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40">
            Real Biological Data
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benchmarks.map((b) => (
              <div
                key={b.variant.raw_query}
                onClick={() => navigate(`/explorer?q=${encodeURIComponent(b.variant.raw_query)}`)}
                className="group relative bg-navy-900 hover:bg-navy-850 border border-navy-800 hover:border-cyan-500/50 rounded-xl p-5 transition-all duration-200 cursor-pointer shadow-lg shadow-navy-950/50 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 block font-semibold">
                        {b.variant.gene_symbol}
                      </span>
                      <h3 className="text-lg font-bold text-white font-mono group-hover:text-cyan-300 transition-colors">
                        {b.variant.protein_change}
                      </h3>
                    </div>
                    {b.clinvar_clinical && (
                      <ClinicalBadge
                        significance={b.clinvar_clinical.clinical_significance}
                        stars={b.clinvar_clinical.review_stars}
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-sans line-clamp-1">
                    {b.protein_name || 'Protein description'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-navy-950/60 p-2.5 rounded-lg border border-navy-800">
                    <div>
                      <span className="text-slate-400 block text-[10px]">cDNA Change:</span>
                      <span className="text-slate-200">{b.variant.cdna_change || 'c.---'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">gnomAD AF:</span>
                      <span className="text-slate-200">
                        {b.gnomad_frequency.allele_frequency !== null && b.gnomad_frequency.allele_frequency !== undefined
                          ? b.gnomad_frequency.allele_frequency.toExponential(2)
                          : 'Unobserved (< 1e-6)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-navy-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-cyan-400 transition-colors">
                  <span className="text-[11px] font-mono">UniProt: {b.uniprot_accession}</span>
                  <div className="flex items-center gap-1 font-medium">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feature Capabilities Grid */}
      <section className="space-y-4 pt-4">
        <div className="border-b border-navy-800 pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-teal" />
            <span>Platform Capabilities</span>
          </h2>
          <p className="text-xs text-slate-400">
            Engineered with strict biological validation and leak-free computational standards
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                onClick={() => navigate(card.to)}
                className="bg-navy-900 hover:bg-navy-850 border border-navy-800 hover:border-cyan-500/40 rounded-xl p-5 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center text-accent-cyan group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-navy-800 text-slate-400 border border-navy-700">
                      {card.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {card.desc}
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-1 text-xs text-cyan-400 font-medium">
                  <span>Explore section</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Scientific Methodology Safeguards Banner */}
      <section className="bg-navy-900 border border-navy-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <GitBranch className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white">Gene-Held-Out Evaluation</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                VariantLens evaluates models strictly via GroupKFold by gene family. Variants of any given gene are never split across train and test.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-accent-teal shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white">Zero Post-Hoc Target Leakage</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                ClinVar review stars, submitter counts, and disease phenotypic descriptions are never fed into the ML model as input features.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white">Missingness Semantics</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Unobserved variants in gnomAD are treated as missing biologically, never silently converted to zero frequency.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
