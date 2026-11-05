import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Database,
  BarChart2,
  Box,
  BrainCircuit,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { VariantSearchBar } from '../components/search/VariantSearchBar';
import { ClinicalBadge } from '../components/common/ClinicalBadge';
import { searchVariant } from '../services/api';
import { VariantAnnotationResponse } from '../types/variant';

export const VariantExplorerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || 'BRAF V600E';

  const [currentVariant, setCurrentVariant] = useState<VariantAnnotationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchVariant(q);
      setCurrentVariant(data);
    } catch (err: any) {
      setError(err.message || 'Variant could not be retrieved');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  // Transform gnomAD populations for bar chart
  const populationData = currentVariant?.gnomad_frequency.populations
    ? Object.entries(currentVariant.gnomad_frequency.populations).map(([pop, freq]) => ({
        population: pop,
        frequency: freq,
        displayFreq: (freq * 100).toFixed(4) + '%',
      }))
    : [];

  return (
    <div className="space-y-8 pb-16">
      {/* Header and Search */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Search className="w-7 h-7 text-accent-cyan" />
            <span>Variant Annotation Explorer</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search human genetic variants to inspect real ClinVar clinical records and gnomAD population frequencies.
          </p>
        </div>

        <div className="max-w-3xl">
          <VariantSearchBar onSearch={performSearch} isLoading={loading} initialQuery={initialQuery} />
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="block text-sm font-semibold text-rose-200">Query Unresolved</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-28 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
            <div className="h-64 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
          </div>
        </div>
      )}

      {currentVariant && !loading && (
        <div className="space-y-8">
          {/* Main Variant Summary Banner */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-mono font-bold text-accent-cyan bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800/60">
                    {currentVariant.variant.gene_symbol}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
                    {currentVariant.variant.protein_change}
                  </h2>
                  {currentVariant.clinvar_clinical && (
                    <ClinicalBadge
                      significance={currentVariant.clinvar_clinical.clinical_significance}
                      stars={currentVariant.clinvar_clinical.review_stars}
                    />
                  )}
                </div>

                <p className="text-sm text-slate-300 font-sans">
                  {currentVariant.protein_name || 'Human Gene Variant'}
                </p>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-slate-400 pt-1">
                  <span>cDNA: <strong className="text-slate-200">{currentVariant.variant.cdna_change || 'c.---'}</strong></span>
                  <span>Transcript: <strong className="text-slate-200">{currentVariant.variant.transcript_id || 'RefSeq'}</strong></span>
                  <span>dbSNP: <strong className="text-slate-200">{currentVariant.variant.rs_id || 'Pending'}</strong></span>
                  <span>Assembly: <strong className="text-slate-200">{currentVariant.variant.assembly}</strong></span>
                  {currentVariant.variant.genomic_location && (
                    <span>Coordinates: <strong className="text-slate-200">{currentVariant.variant.genomic_location}</strong></span>
                  )}
                </div>
              </div>

              {/* Quick Navigation to Downstream Modules */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(`/protein-3d?uniprot=${currentVariant.uniprot_accession}&pos=${currentVariant.variant.protein_position}&wt=${currentVariant.variant.wild_type_aa}&mut=${currentVariant.variant.mutant_aa}`)}
                  className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>View in 3D Mol*</span>
                </button>
                <button
                  onClick={() => navigate(`/prediction?q=${encodeURIComponent(currentVariant.variant.raw_query)}`)}
                  className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-teal-300 border border-teal-500/30 hover:border-teal-400 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Explainability & SHAP</span>
                </button>
                <button
                  onClick={() => navigate(`/evidence?q=${encodeURIComponent(currentVariant.variant.raw_query)}`)}
                  className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-300 hover:text-white border border-navy-700 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>PubMed Citations</span>
                </button>
              </div>
            </div>
          </div>

          {/* ClinVar & gnomAD Two-Column Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ClinVar Clinical Evidence Panel */}
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-accent-cyan" />
                  <h3 className="text-base font-bold text-white">NCBI ClinVar Annotation</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  VCV: {currentVariant.clinvar_clinical?.variation_id || 'N/A'}
                </span>
              </div>

              {currentVariant.clinvar_clinical ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                      <span className="text-[11px] text-slate-400 block">Clinical Significance:</span>
                      <span className="text-sm font-semibold text-white mt-1 block">
                        {currentVariant.clinvar_clinical.clinical_significance}
                      </span>
                    </div>
                    <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                      <span className="text-[11px] text-slate-400 block">Review Confidence:</span>
                      <span className="text-sm font-semibold text-amber-400 mt-1 block">
                        {currentVariant.clinvar_clinical.review_stars} of 4 Stars
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-navy-800/80">
                      <span className="text-slate-400">Review Status:</span>
                      <span className="text-slate-200 font-mono text-right">{currentVariant.clinvar_clinical.review_status}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-navy-800/80">
                      <span className="text-slate-400">Clinical Submitters:</span>
                      <span className="text-slate-200 font-mono">{currentVariant.clinvar_clinical.submitter_count} laboratories</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-navy-800/80">
                      <span className="text-slate-400">Last Evaluated:</span>
                      <span className="text-slate-200 font-mono">{currentVariant.clinvar_clinical.last_evaluated || 'Recent'}</span>
                    </div>
                  </div>

                  {currentVariant.clinvar_clinical.all_traits.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs text-slate-400 block font-medium">Reported Disease Phenotypes:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentVariant.clinvar_clinical.all_traits.map((trait) => (
                          <span
                            key={trait}
                            className="px-2.5 py-1 rounded bg-navy-800 text-slate-300 border border-navy-750 text-[11px]"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 bg-navy-950/60 rounded-lg border border-navy-800">
                  <p>No ClinVar clinical submission currently cataloged for this specific query syntax.</p>
                </div>
              )}
            </div>

            {/* gnomAD Population Frequency Panel */}
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-accent-teal" />
                  <h3 className="text-base font-bold text-white">gnomAD Population Genetics</h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Version 4.1 Exomes</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                    <span className="text-[11px] text-slate-400 block">Exome Allele Frequency:</span>
                    <span className="text-base font-bold font-mono text-white mt-1 block">
                      {currentVariant.gnomad_frequency.allele_frequency !== null && currentVariant.gnomad_frequency.allele_frequency !== undefined
                        ? currentVariant.gnomad_frequency.allele_frequency.toExponential(3)
                        : (
                          <span className="text-amber-400 text-xs">Unobserved (Deleterious/Rare)</span>
                        )}
                    </span>
                  </div>
                  <div className="bg-navy-950 p-3 rounded-lg border border-navy-800">
                    <span className="text-[11px] text-slate-400 block">Homozygous Count:</span>
                    <span className="text-base font-bold font-mono text-white mt-1 block">
                      {currentVariant.gnomad_frequency.homozygous_count !== null && currentVariant.gnomad_frequency.homozygous_count !== undefined
                        ? currentVariant.gnomad_frequency.homozygous_count
                        : '0'}
                    </span>
                  </div>
                </div>

                {populationData.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs text-slate-400 block font-medium">Ancestry Population Breakdown:</span>
                    <div className="h-44 w-full bg-navy-950/60 p-2 rounded-lg border border-navy-800">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={populationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="population" stroke="#64748B" fontSize={11} />
                          <YAxis stroke="#64748B" fontSize={10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(value: any) => [value, 'Allele Frequency']}
                          />
                          <Bar dataKey="frequency" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-navy-950/80 border border-navy-800 rounded-lg text-xs text-slate-400 space-y-1">
                    <span className="font-semibold text-slate-300 block">Missingness Handling:</span>
                    <p>
                      This variant is absent from the gnomAD reference cohort. Under our biological modeling rules, this is maintained as unobserved rather than assumed to be zero.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
