import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Database,
  ExternalLink,
  FileText,
  AlertCircle,
  Info,
  Search,
  BrainCircuit,
  Box,
  Calendar,
  Users,
} from 'lucide-react';
import { ClinicalBadge } from '../components/common/ClinicalBadge';
import { predictVariant } from '../services/api';
import { PredictResponse, PubMedCitation } from '../types/variant';

export const EvidencePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryParam = searchParams.get('q') || 'BRAF V600E';
  const [queryInput, setQueryInput] = useState(queryParam);
  const [data, setData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const curatedBenchmarks = [
    { label: 'BRAF V600E', gene: 'BRAF', wt: 'Val', pos: 600, mut: 'Glu' },
    { label: 'TP53 R175H', gene: 'TP53', wt: 'Arg', pos: 175, mut: 'His' },
    { label: 'BRCA1 C61G', gene: 'BRCA1', wt: 'Cys', pos: 61, mut: 'Gly' },
    { label: 'KRAS G12D', gene: 'KRAS', wt: 'Gly', pos: 12, mut: 'Asp' },
    { label: 'PTEN R130G', gene: 'PTEN', wt: 'Arg', pos: 130, mut: 'Gly' },
  ];

  const parseQuery = (text: string) => {
    const q = text.trim();
    const m3 = q.match(/^([A-Za-z0-9]+)[\s:]+(?:p\.)?([A-Za-z]{3})(\d+)([A-Za-z]{3})$/);
    if (m3) return { gene: m3[1].toUpperCase(), wt: m3[2], pos: parseInt(m3[3], 10), mut: m3[4] };

    const m1 = q.match(/^([A-Za-z0-9]+)[\s:]+(?:p\.)?([A-Za-z])(\d+)([A-Za-z])$/);
    if (m1) return { gene: m1[1].toUpperCase(), wt: m1[2], pos: parseInt(m1[3], 10), mut: m1[4] };

    return null;
  };

  const loadEvidence = async (targetQuery: string) => {
    setError(null);
    const parsed = parseQuery(targetQuery);
    if (!parsed) {
      setError(`Could not parse variant query "${targetQuery}". Please format as "GENE PosMut" (e.g. "BRAF V600E" or "TP53 R175H").`);
      return;
    }

    setLoading(true);
    try {
      const res = await predictVariant({
        gene_symbol: parsed.gene,
        wild_type_aa: parsed.wt,
        mutant_aa: parsed.mut,
        protein_position: parsed.pos,
        include_clinical: true,
        include_citations: true,
      });
      setData(res);
      setSearchParams({ q: targetQuery });
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve evidence and citations from backend services.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryParam) {
      loadEvidence(queryParam);
    }
  }, [queryParam]);

  const clinvarRecord = data?.clinical_annotation?.record;
  const citations = data?.citations || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2 border-b border-navy-800 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-xs font-mono text-cyan-400 mb-1">
          <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Biomedical Evidence & Bibliographic Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <span>Clinical Assertions & Literature Evidence</span>
        </h1>
        <p className="text-sm text-slate-400">
          Independent clinical records from NCBI ClinVar alongside real peer-reviewed scientific citations retrieved via NCBI Entrez E-utilities.
        </p>
      </div>

      {/* Query Bar & Curated Benchmarks */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEvidence(queryInput)}
              placeholder="Search e.g. BRAF V600E, TP53 R175H, BRCA1 C61G..."
              className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white font-mono outline-none"
            />
          </div>
          <button
            onClick={() => loadEvidence(queryInput)}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 text-navy-950 font-bold px-5 py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 font-mono disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Evidence'}
          </button>
        </div>

        {/* Quick Benchmark Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="text-slate-400 text-[11px] font-mono">Curated Benchmarks:</span>
          {curatedBenchmarks.map((b) => (
            <button
              key={b.label}
              onClick={() => {
                setQueryInput(b.label);
                loadEvidence(b.label);
              }}
              className="px-2.5 py-1 rounded bg-navy-950 hover:bg-navy-800 text-cyan-300 border border-navy-800 hover:border-cyan-800 transition-colors font-mono text-[11px]"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-4 rounded-xl flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="block text-sm font-semibold text-rose-200">Query Resolution Error</strong>
            <p className="font-sans leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="h-44 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
          <div className="h-64 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
        </div>
      )}

      {/* Evidence Panels */}
      {data && (
        <div className="space-y-8">
          {/* Section 1: NCBI ClinVar Clinical Ground Truth */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-accent-cyan" />
                <div>
                  <h3 className="text-base font-bold text-white">NCBI ClinVar Clinical Consensus Assertion</h3>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Source: {clinvarRecord?.source_attribution || 'NCBI ClinVar Database'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                Independent Gold Standard
              </span>
            </div>

            {clinvarRecord ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Clinical Classification */}
                <div className="bg-navy-950 p-5 rounded-xl border border-navy-800 space-y-3">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
                    Consensus Classification
                  </span>
                  <div>
                    <ClinicalBadge
                      significance={clinvarRecord.clinical_significance}
                      stars={clinvarRecord.review_stars}
                    />
                  </div>
                  <div className="pt-2 text-xs space-y-1">
                    <span className="text-slate-400 block text-[11px]">Review Status:</span>
                    <span className="text-slate-200 font-mono text-[11px] font-medium block">
                      {clinvarRecord.review_status}
                    </span>
                  </div>
                </div>

                {/* Submissions & Variation Link */}
                <div className="bg-navy-950 p-5 rounded-xl border border-navy-800 space-y-3 text-xs">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
                    Provenance & Submission Details
                  </span>
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">ClinVar Variation ID:</span>
                    {clinvarRecord.variation_id ? (
                      <a
                        href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${clinvarRecord.variation_id}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                      >
                        #{clinvarRecord.variation_id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 font-mono">N/A</span>
                    )}
                  </div>
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">Independent Submitters:</span>
                    <span className="text-slate-200 font-mono font-medium">
                      {clinvarRecord.submitter_count > 0 ? `${clinvarRecord.submitter_count} laboratories` : 'Criteria Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">Variant Identity:</span>
                    <span className="font-mono text-cyan-300">
                      {data.variant.gene_symbol} {data.variant.protein_change_hgvs}
                    </span>
                  </div>
                </div>

                {/* Associated Traits */}
                <div className="bg-navy-950 p-5 rounded-xl border border-navy-800 space-y-3">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
                    Associated Condition(s)
                  </span>
                  {clinvarRecord.all_traits.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                      {clinvarRecord.all_traits.map((trait, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-navy-850 text-slate-200 px-2.5 py-1 rounded border border-navy-750 font-sans"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">None specifically annotated in record</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-navy-950 p-6 rounded-xl border border-navy-800 text-center space-y-2">
                <Info className="w-6 h-6 text-slate-400 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No ClinVar Record Found</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  This variant is not cataloged with a consensus clinical assertion in the audited high-confidence ClinVar release.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Real PubMed Literature Evidence */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-accent-teal" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Peer-Reviewed Scientific Literature ({citations.length} Indexed)
                  </h3>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Retrieved via NCBI PubMed E-utilities API
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-navy-950 text-slate-300 border border-navy-750 shrink-0">
                NCBI Entrez Query
              </span>
            </div>

            {citations.length > 0 ? (
              <div className="space-y-4">
                {citations.map((cite: PubMedCitation) => (
                  <div
                    key={cite.pmid}
                    className="bg-navy-950 border border-navy-800 rounded-xl p-5 space-y-3 hover:border-navy-700 transition-colors shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {cite.title}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={cite.pubmed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-navy-850 hover:bg-navy-800 text-cyan-300 border border-navy-750 rounded text-xs font-mono flex items-center gap-1.5 transition-colors"
                        >
                          <span>PMID:{cite.pmid}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {cite.doi_url && (
                          <a
                            href={cite.doi_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-navy-850 hover:bg-navy-800 text-slate-300 border border-navy-750 rounded text-xs font-mono flex items-center gap-1.5 transition-colors"
                          >
                            <span>DOI</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-sans">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cite.authors_formatted}</span>
                      </div>
                      <div className="flex items-center gap-1 text-cyan-400/90 font-mono text-[11px]">
                        <span>{cite.journal}</span>
                      </div>
                      {cite.pub_date && (
                        <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          <span>{cite.pub_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-navy-950 p-6 rounded-xl border border-navy-800 text-center space-y-2">
                <Info className="w-6 h-6 text-slate-400 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Direct PubMed Citations Indexed</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  NCBI Entrez did not return direct peer-reviewed articles matching this variant syntax. VariantLens never invents synthetic scientific references.
                </p>
              </div>
            )}
          </div>

          {/* Cross-Link Bar */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <span className="text-xs font-mono text-cyan-400 block">Explore Companion Tools</span>
              <span className="text-sm text-slate-300">View 3D protein structure or ML pathogenicity explanations for this variant.</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/protein-3d?gene=${data.variant.gene_symbol}&pos=${data.variant.protein_position}&wt=${data.variant.wild_type_aa}&mut=${data.variant.mutant_aa}&uniprot=${data.biological_context?.uniprot_accession || ''}`)}
                className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <Box className="w-3.5 h-3.5 text-accent-cyan" />
                <span>3D Protein</span>
              </button>
              <button
                onClick={() => navigate(`/prediction?gene=${data.variant.gene_symbol}&pos=${data.variant.protein_position}&wt=${data.variant.wild_type_aa}&mut=${data.variant.mutant_aa}`)}
                className="px-3.5 py-2 rounded-lg bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-accent-teal" />
                <span>TreeSHAP Prediction</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
