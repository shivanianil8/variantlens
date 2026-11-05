import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Database,
  Info,
  Layers,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Box,
  BookOpen,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ClinicalBadge } from '../components/common/ClinicalBadge';
import { predictVariant } from '../services/api';
import { PredictResponse, PredictRequest } from '../types/variant';

export const PredictionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse initial query params
  const paramQ = searchParams.get('q') || '';
  const paramGene = searchParams.get('gene') || '';
  const paramPos = searchParams.get('pos') || '';
  const paramWt = searchParams.get('wt') || '';
  const paramMut = searchParams.get('mut') || '';

  // Form inputs
  const [geneInput, setGeneInput] = useState(paramGene || 'BRAF');
  const [wtInput, setWtInput] = useState(paramWt || 'Val');
  const [posInput, setPosInput] = useState(paramPos || '600');
  const [mutInput, setMutInput] = useState(paramMut || 'Glu');

  // State
  const [predictionData, setPredictionData] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick benchmarks
  const curatedBenchmarks = [
    { label: 'BRAF V600E', gene: 'BRAF', wt: 'Val', pos: 600, mut: 'Glu', role: 'Kinase activation loop' },
    { label: 'TP53 R175H', gene: 'TP53', wt: 'Arg', pos: 175, mut: 'His', role: 'DNA-binding core zinc coordination' },
    { label: 'BRCA1 C61G', gene: 'BRCA1', wt: 'Cys', pos: 61, mut: 'Gly', role: 'N-terminal RING zinc-finger domain' },
    { label: 'KRAS G12D', gene: 'KRAS', wt: 'Gly', pos: 12, mut: 'Asp', role: 'GTPase P-loop hotspot' },
    { label: 'PTEN R130G', gene: 'PTEN', wt: 'Arg', pos: 130, mut: 'Gly', role: 'Phosphatase active site' },
  ];

  // Helper to parse unstructured string e.g. "BRAF V600E" or "p.Val600Glu"
  const parseQueryString = (queryStr: string) => {
    const q = queryStr.trim();
    const match1 = q.match(/^([A-Za-z0-9]+)[\s:]+(?:p\.)?([A-Za-z]{3})(\d+)([A-Za-z]{3})$/);
    if (match1) {
      return { gene: match1[1].toUpperCase(), wt: match1[2], pos: match1[3], mut: match1[4] };
    }
    const match2 = q.match(/^([A-Za-z0-9]+)[\s:]+(?:p\.)?([A-Za-z])(\d+)([A-Za-z])$/);
    if (match2) {
      return { gene: match2[1].toUpperCase(), wt: match2[2], pos: match2[3], mut: match2[4] };
    }
    return null;
  };

  const handlePredict = async (gene: string, wt: string, pos: string | number, mut: string) => {
    setError(null);
    const parsedPos = parseInt(String(pos), 10);

    // Client-side quick checks
    if (!gene.trim()) {
      setError('Please provide a valid human gene symbol (e.g., BRAF, TP53, BRCA1).');
      return;
    }
    if (isNaN(parsedPos) || parsedPos < 1) {
      setError('Residue position must be a positive integer greater than or equal to 1.');
      return;
    }
    if (!wt.trim() || !mut.trim()) {
      setError('Both wild-type reference and mutant alternate amino acids must be specified.');
      return;
    }
    if (wt.trim().toUpperCase() === mut.trim().toUpperCase()) {
      setError(`Synonymous substitution detected (${wt}${pos}${mut}). VariantLens ML is specifically trained on missense single-nucleotide variants.`);
      return;
    }

    setLoading(true);
    try {
      const payload: PredictRequest = {
        gene_symbol: gene.trim().toUpperCase(),
        wild_type_aa: wt.trim(),
        mutant_aa: mut.trim(),
        protein_position: parsedPos,
        include_clinical: true,
        include_citations: true,
      };

      const res = await predictVariant(payload);
      setPredictionData(res);
      setSearchParams({
        gene: res.variant.gene_symbol,
        pos: String(res.variant.protein_position),
        wt: res.variant.wild_type_aa,
        mut: res.variant.mutant_aa,
      });
    } catch (err: any) {
      setError(err.message || 'Variant pathogenicity prediction request failed');
      setPredictionData(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (paramQ) {
      const parsed = parseQueryString(paramQ);
      if (parsed) {
        setGeneInput(parsed.gene);
        setWtInput(parsed.wt);
        setPosInput(parsed.pos);
        setMutInput(parsed.mut);
        handlePredict(parsed.gene, parsed.wt, parsed.pos, parsed.mut);
        return;
      }
    }
    if (paramGene && paramPos && paramWt && paramMut) {
      handlePredict(paramGene, paramWt, paramPos, paramMut);
    } else {
      // Default initial prediction on BRAF V600E
      handlePredict('BRAF', 'Val', 600, 'Glu');
    }
  }, []);

  const selectBenchmark = (b: typeof curatedBenchmarks[0]) => {
    setGeneInput(b.gene);
    setWtInput(b.wt);
    setPosInput(String(b.pos));
    setMutInput(b.mut);
    handlePredict(b.gene, b.wt, b.pos, b.mut);
  };

  // Prepare SHAP chart data
  const attributions = predictionData?.model_prediction.feature_attributions || [];
  const chartData = attributions.map((item) => ({
    name: item.display_name,
    featureName: item.feature_name,
    shap: item.signed_shap_value,
    absShap: item.absolute_shap_value,
    value: item.feature_value,
    effect: item.directional_effect,
    bio: item.biological_meaning,
  }));

  const prob = predictionData?.model_prediction.pathogenicity_probability ?? 0;
  const isHighRisk = prob >= 0.50;

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="space-y-2 border-b border-navy-800 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-xs font-mono text-cyan-400">
          <BrainCircuit className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Real-Time Inference & TreeSHAP Attribution Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <span>In Silico Pathogenicity Prediction</span>
        </h1>
        <p className="text-sm text-slate-400">
          Evaluated via our trained XGBoost classifier (5-fold gene-held-out cross-validated; ROC-AUC 0.8076) and explained through exact Shapley feature values.
        </p>
      </div>

      {/* Input Formulation Card */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <span>Variant Specification</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">Missense SNV Consequence</span>
        </div>

        {/* Input Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Gene Symbol</label>
            <input
              type="text"
              value={geneInput}
              onChange={(e) => setGeneInput(e.target.value.toUpperCase())}
              placeholder="e.g. BRAF"
              className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Wild-Type Residue</label>
            <input
              type="text"
              value={wtInput}
              onChange={(e) => setWtInput(e.target.value)}
              placeholder="e.g. Val or V"
              className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Residue Position</label>
            <input
              type="number"
              min="1"
              value={posInput}
              onChange={(e) => setPosInput(e.target.value)}
              placeholder="e.g. 600"
              className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Mutant Residue</label>
            <input
              type="text"
              value={mutInput}
              onChange={(e) => setMutInput(e.target.value)}
              placeholder="e.g. Glu or E"
              className="w-full bg-navy-950 border border-navy-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => handlePredict(geneInput, wtInput, posInput, mutInput)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-navy-950 font-bold px-4 py-2 rounded-lg text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-cyan-950"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-navy-950 border-t-transparent rounded-full animate-spin" />
                  Calculating...
                </span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Predict
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Benchmark Chips */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Quick Benchmarks:</span>
          {curatedBenchmarks.map((b) => (
            <button
              key={b.label}
              onClick={() => selectBenchmark(b)}
              className="px-2.5 py-1 rounded bg-navy-950 hover:bg-navy-800 text-cyan-300 border border-navy-800 hover:border-cyan-700/60 transition-colors font-mono text-[11px]"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 p-4 rounded-xl flex items-start gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="block text-sm font-semibold text-rose-200">Prediction Request Error</strong>
            <p className="leading-relaxed font-sans">{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !predictionData && (
        <div className="space-y-4">
          <div className="h-40 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
          <div className="h-96 rounded-xl bg-navy-900 border border-navy-800 animate-pulse" />
        </div>
      )}

      {/* Prediction Output Results */}
      {predictionData && (
        <div className="space-y-8">
          {/* Main Scoring Header: Score vs ClinVar Separation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model In Silico Prediction Card (2 cols) */}
            <div className="lg:col-span-2 bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-5 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-accent-cyan" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      VariantLens Computational In Silico Score
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400 block">
                      Model Version: {predictionData.model_prediction.model_version} • Decision Threshold: 0.50
                    </span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded bg-navy-950 text-slate-300 border border-navy-750">
                  Non-Diagnostic Metric
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Probability Gauge & Category */}
                <div className="bg-navy-950 p-5 rounded-xl border border-navy-800 space-y-2 text-center">
                  <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                    VariantLens In Silico Pathogenicity Score
                  </span>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className={`text-4xl sm:text-5xl font-black font-mono ${isHighRisk ? 'text-rose-400' : 'text-slate-200'}`}>
                      {(prob * 100).toFixed(1)}%
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({prob.toFixed(4)})
                    </span>
                  </div>

                  <div className="pt-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      prob >= 0.70
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        : prob >= 0.50
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                        : prob >= 0.30
                        ? 'bg-slate-900 text-cyan-300 border border-slate-700'
                        : 'bg-sky-950/80 text-sky-300 border border-sky-800'
                    }`}>
                      {predictionData.model_prediction.prediction_category}
                    </span>
                  </div>
                </div>

                {/* Score Context */}
                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">Score Provenance:</span>
                    <span className="font-mono text-cyan-300 font-medium text-[11px] text-right truncate max-w-[200px]" title={predictionData.model_prediction.prediction_provenance}>
                      {predictionData.model_prediction.prediction_provenance ? 'Final Deployed Model' : 'Deployed XGBoost'}
                    </span>
                  </div>
                  {predictionData.model_prediction.oof_benchmark_score !== null && predictionData.model_prediction.oof_benchmark_score !== undefined && (
                    <div className="flex justify-between py-1 border-b border-navy-800">
                      <span className="text-slate-400">Offline OOF Cross-Val Score:</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {predictionData.model_prediction.oof_benchmark_score.toFixed(4)} (Held-Out Fold)
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">Decision Threshold:</span>
                    <span className="font-mono text-slate-200">
                      τ = 0.50 (Class 1 if ≥ 0.50)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">TreeSHAP Base Expected Value:</span>
                    <span className="font-mono text-slate-200">
                      {predictionData.model_prediction.shap_base_value.toFixed(4)} log-odds
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-navy-800">
                    <span className="text-slate-400">HGVS Protein:</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {predictionData.variant.gene_symbol} {predictionData.variant.protein_change_hgvs}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Precedence & Scientific Warning Note */}
              <div className="bg-navy-950 p-3.5 rounded-lg border border-navy-800 space-y-2 text-xs">
                {predictionData.clinical_annotation.record?.clinical_significance === 'Pathogenic' && prob < 0.50 && (
                  <div className="bg-rose-950/40 border border-rose-800/80 p-2.5 rounded text-[11px] text-rose-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-rose-300">Clinical Evidence Precedence:</strong>
                      Independent ClinVar assertion is <strong>PATHOGENIC</strong>. The lower sequence score ({prob.toFixed(4)}) reflects conservative linear substitution properties and <strong>does NOT override clinical diagnostic consensus</strong>.
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 text-[11px] text-slate-400">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {predictionData.model_prediction.clinical_override_notice ||
                      'Computational predictions quantify statistical resemblance to ClinVar training patterns and do NOT override expert clinical assertions.'}
                  </p>
                </div>
              </div>
            </div>

            {/* ClinVar Clinical Ground Truth (Separate Panel) */}
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-accent-cyan" />
                    <h3 className="text-sm font-bold text-white">ClinVar Clinical Record</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Gold Standard
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {predictionData.clinical_annotation.clinical_vs_model_notice}
                </p>

                {predictionData.clinical_annotation.record ? (
                  <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Clinical Assertion:</span>
                      <ClinicalBadge
                        significance={predictionData.clinical_annotation.record.clinical_significance}
                        stars={predictionData.clinical_annotation.record.review_stars}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Review Status:</span>
                      <span className="text-slate-200 font-mono text-[11px] text-right truncate max-w-[160px]" title={predictionData.clinical_annotation.record.review_status}>
                        {predictionData.clinical_annotation.record.review_status}
                      </span>
                    </div>
                    {predictionData.clinical_annotation.record.variation_id && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Variation ID:</span>
                        <a
                          href={`https://www.ncbi.nlm.nih.gov/clinvar/variation/${predictionData.clinical_annotation.record.variation_id}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          #{predictionData.clinical_annotation.record.variation_id}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {predictionData.clinical_annotation.record.all_traits.length > 0 && (
                      <div className="pt-2 border-t border-navy-850">
                        <span className="text-[11px] text-slate-400 block mb-1">Associated Condition(s):</span>
                        <div className="flex flex-wrap gap-1">
                          {predictionData.clinical_annotation.record.all_traits.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="text-[10px] bg-navy-850 text-slate-300 px-2 py-0.5 rounded border border-navy-750">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center py-6">
                    <Info className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                    <span className="text-xs text-slate-400 block">No matching ClinVar clinical record found for this exact residue substitution.</span>
                    <span className="text-[11px] text-slate-500 block mt-1">Classified as uncataloged or VUS in ClinVar benchmark.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/protein-3d?gene=${predictionData.variant.gene_symbol}&pos=${predictionData.variant.protein_position}&wt=${predictionData.variant.wild_type_aa}&mut=${predictionData.variant.mutant_aa}&uniprot=${predictionData.biological_context?.uniprot_accession || ''}`)}
                  className="w-full bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-center gap-2 transition-colors"
                >
                  <Box className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Inspect 3D Protein Structure</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
                </button>
                <button
                  onClick={() => navigate(`/evidence?q=${predictionData.variant.gene_symbol} ${predictionData.variant.wild_type_aa}${predictionData.variant.protein_position}${predictionData.variant.mutant_aa}&gene=${predictionData.variant.gene_symbol}`)}
                  className="w-full bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-center gap-2 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-accent-teal" />
                  <span>View Citations & Evidence</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* TreeSHAP Waterfall Visualization Section */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-accent-teal" />
                  <span>TreeSHAP Feature Attributions (Waterfall Chart)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Directional contributions (log-odds $\phi$) of each biological property pushing predictions toward or away from pathogenicity.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-500" />
                  <span className="text-slate-300">Positive (Pathogenic)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-400" />
                  <span className="text-slate-300">Negative (Protective)</span>
                </div>
              </div>
            </div>

            {/* Recharts Waterfall Horizontal Bar Chart */}
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 160, bottom: 20 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    domain={['auto', 'auto']}
                    stroke="#334155"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#e2e8f0', fontSize: 12 }}
                    stroke="#334155"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-navy-950 border border-navy-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 max-w-sm">
                            <strong className="block text-white font-semibold">{data.name}</strong>
                            <div className="flex justify-between font-mono text-[11px] text-slate-300">
                              <span>Observed Value:</span>
                              <span className="text-cyan-300 font-bold">{data.value}</span>
                            </div>
                            <div className="flex justify-between font-mono text-[11px] text-slate-300">
                              <span>SHAP Contribution ($\phi$):</span>
                              <span className={`font-bold ${data.shap > 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                {data.shap > 0 ? `+${data.shap.toFixed(4)}` : data.shap.toFixed(4)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 pt-1 border-t border-navy-800">
                              {data.effect}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} strokeDasharray="3 3" />
                  <Bar dataKey="shap" radius={[4, 4, 4, 4]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.shap >= 0 ? '#f43f5e' : '#38bdf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Feature Explanations Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-navy-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Rank & Feature</th>
                    <th className="py-2.5 px-3">Observed Value</th>
                    <th className="py-2.5 px-3 text-right">Signed SHAP ($\phi$)</th>
                    <th className="py-2.5 px-3">Directional Role</th>
                    <th className="py-2.5 px-3">Biophysical Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-850">
                  {attributions.map((attr, idx) => {
                    const isPos = attr.signed_shap_value > 0;
                    return (
                      <tr key={attr.feature_name} className="hover:bg-navy-850/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500 w-4">#{idx + 1}</span>
                            <span>{attr.display_name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block ml-6">{attr.feature_name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-cyan-300">
                          {attr.feature_value}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            isPos ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80' : 'bg-sky-950/80 text-sky-300 border border-sky-800/80'
                          }`}>
                            {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPos ? `+${attr.signed_shap_value.toFixed(4)}` : attr.signed_shap_value.toFixed(4)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-xs leading-relaxed">
                          {attr.directional_effect}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-sm leading-relaxed text-[11px]">
                          {attr.biological_meaning}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
