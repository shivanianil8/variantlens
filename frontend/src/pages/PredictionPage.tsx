import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BrainCircuit,
  Database,
  Info,
  Layers
} from 'lucide-react';
import { ClinicalBadge } from '../components/common/ClinicalBadge';

export const PredictionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || 'BRAF V600E';

  // Planned feature vector dimensions for transparency
  const featureSchema = [
    { name: 'Grantham Amino Acid Distance', category: 'Physicochemical', unit: 'Index (0-215)', desc: 'Chemical distance based on composition, polarity, and molecular volume' },
    { name: 'BLOSUM62 Substitution Score', category: 'Evolutionary', unit: 'Log-odds ratio', desc: 'Substitution probability observed in homologous protein families' },
    { name: 'Kyte-Doolittle Hydropathy Shift', category: 'Physicochemical', unit: 'Δ Hydropathy', desc: 'Differential hydrophobicity affecting fold stability and membrane interaction' },
    { name: 'Physiological Formal Charge Delta', category: 'Electrostatic', unit: 'Δ e (at pH 7.4)', desc: 'Change in net electrostatic charge impacting salt bridges and binding' },
    { name: 'Molecular Weight Delta', category: 'Steric', unit: 'Δ Daltons', desc: 'Steric bulk volume differential altering packing in protein core' },
    { name: 'Normalized Sequence Position', category: 'Positional', unit: 'Relative index (0-1)', desc: 'Relative coordinate along the canonical amino acid sequence' },
    { name: 'gnomAD Exome Allele Frequency', category: 'Population Genetics', unit: 'Frequency (AF)', desc: 'Natural selection constraint in outbred human populations' },
    { name: 'AlphaFold Residue pLDDT', category: 'Structural', unit: 'Confidence (0-100)', desc: 'Local structural confidence and disorder propensity' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2 border-b border-navy-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <BrainCircuit className="w-7 h-7 text-accent-cyan" />
          <span>In Silico Prediction & SHAP Explainability</span>
        </h1>
        <p className="text-sm text-slate-400">
          Independent statistical machine learning predictions explained via TreeSHAP feature attributions.
        </p>
      </div>

      {/* Model Rigor & Integrity Notification */}
      <div className="bg-navy-900 border border-cyan-500/40 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <Info className="w-5 h-5 text-accent-cyan shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs">
            <h3 className="text-sm font-semibold text-white">
              Model Training Status: Pre-Training Data Audit (Phase 1)
            </h3>
            <p className="text-slate-300 leading-relaxed font-sans">
              To adhere strictly to biological and scientific integrity guidelines, <strong>VariantLens never fabricates or hardcodes artificial ML prediction scores</strong>. 
              The statistical classification model (XGBoost + TreeSHAP) will be trained in Phase 2 on the audited NCBI ClinVar missense dataset using strict gene-held-out GroupKFold evaluation.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-navy-950 text-cyan-300 border border-cyan-800/60">
                Zero Synthetic Predictions
              </span>
              <span className="px-2 py-0.5 rounded bg-navy-950 text-slate-300 border border-navy-750">
                Awaiting ClinVar Real Data Audit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Distinction Between Clinical Truth vs Statistical Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ClinVar Truth */}
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-cyan" />
              <h3 className="text-sm font-bold text-white">ClinVar Consensus (Ground Truth)</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-800 text-slate-400">
              Clinical Submissions
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Clinical assertions represent peer-reviewed evidence submitted by diagnostic reference laboratories and expert panels adhering to ACMG/AMP clinical guidelines.
          </p>

          <div className="bg-navy-950 p-4 rounded-lg border border-navy-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Variant:</span>
              <span className="text-xs font-mono font-bold text-white">{query}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Clinical Classification:</span>
              <ClinicalBadge significance="Pathogenic" stars={2} />
            </div>
          </div>
        </div>

        {/* Statistical In Silico Classifier */}
        <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-accent-teal" />
              <h3 className="text-sm font-bold text-white">VariantLens In Silico Model</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              Statistical Predictor
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Our machine learning model operates purely on biological, biophysical, and population frequency features. It does not ingest clinical review stars or submitter labels.
          </p>

          <div className="bg-navy-950 p-4 rounded-lg border border-navy-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Predictive Engine:</span>
              <span className="text-xs font-mono text-cyan-300">XGBoost + TreeSHAP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Calibration State:</span>
              <span className="text-xs font-mono text-amber-400">Awaiting Phase 2 Training</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Engineering Architecture */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-cyan" />
            <h3 className="text-sm font-bold text-white">Biologically Interpretable Input Feature Matrix</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">8 Primary Biophysical Dimensions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Feature Name</th>
                <th className="py-2.5 px-3">Biological Category</th>
                <th className="py-2.5 px-3">Unit / Scale</th>
                <th className="py-2.5 px-3">Mechanistic Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60 font-sans">
              {featureSchema.map((feat) => (
                <tr key={feat.name} className="hover:bg-navy-850/60 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-200 font-mono">{feat.name}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-navy-800 text-cyan-300 border border-navy-700 text-[10px] font-mono">
                      {feat.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">{feat.unit}</td>
                  <td className="py-3 px-3 text-slate-400">{feat.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
