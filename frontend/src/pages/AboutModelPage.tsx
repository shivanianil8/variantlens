import React, { useEffect, useState } from 'react';
import {
  Info,
  ShieldCheck,
  GitBranch,
  Layers,
  AlertTriangle,
  Scale,
  Cpu,
  Database
} from 'lucide-react';
import { fetchModelMetadata } from '../services/api';
import { ModelMetadataResponse } from '../types/variant';

export const AboutModelPage: React.FC = () => {
  const [metadata, setMetadata] = useState<ModelMetadataResponse | null>(null);

  useEffect(() => {
    fetchModelMetadata()
      .then(setMetadata)
      .catch((err) => console.error("Error loading model metadata:", err));
  }, []);

  const plannedBaselines = [
    { name: 'Prior / Majority Class Dummy Baseline', role: 'Lower performance bound', metric: 'Macro F1 / Balanced Accuracy' },
    { name: 'Standard Logistic Regression (L2 penalty)', role: 'Linear interpretability benchmark', metric: 'Coefficients & Odds Ratios' },
    { name: 'Random Forest Ensemble (100 Trees)', role: 'Non-linear tree ensemble baseline', metric: 'Out-of-Bag & Group-CV PR-AUC' },
    { name: 'Gradient Boosted Trees (XGBoost)', role: 'Primary in silico classifier', metric: 'Calibrated Probability & TreeSHAP' },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="space-y-2 border-b border-navy-800 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-xs font-mono text-cyan-400">
          <Info className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Scientific Model Card & Protocol Transparency</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          About the VariantLens Predictive Model
        </h1>
        <p className="text-sm text-slate-400">
          Methodological design, data leakage safeguards, and baseline benchmark protocol.
        </p>
      </div>

      {/* Model Status Card */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
          <div>
            <span className="text-xs font-mono text-slate-400">System Model Artifact</span>
            <h2 className="text-lg font-bold text-white">
              {metadata?.model_name || 'VariantLens In Silico Pathogenicity Predictor'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono text-amber-300 bg-amber-950/70 px-2.5 py-1 rounded border border-amber-800/80">
              Phase 1 Status: Ready for ClinVar Data Audit
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          In strict compliance with bioinformatics and machine learning standards, <strong>VariantLens will never claim a model has been trained unless it actually has</strong>. 
          The model training pipeline is scheduled for Phase 2 following full acquisition, cleaning, and statistical auditing of the NCBI ClinVar dataset.
        </p>
      </div>

      {/* Data Leakage Safeguards Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent-cyan" />
          <h3 className="text-base font-bold text-white">Leakage Prevention Safeguards</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
              <GitBranch className="w-4 h-4 text-accent-cyan" />
              <span>Gene-Level GroupKFold Partitioning</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standard random cross-validation leaks gene-level properties (e.g. sequence length, pLI intolerance, homologous domains). 
              Our evaluation enforces <strong>GroupKFold partitioned by gene symbol</strong>, ensuring that all variants of a gene reside exclusively in either the training or the held-out validation set.
            </p>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-teal-300 font-semibold text-sm">
              <Database className="w-4 h-4 text-accent-teal" />
              <span>Zero Post-Hoc Target Leakage</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The model feature vector strictly contains biophysical and evolutionary annotations available <em>a priori</em>. 
              ClinVar review stars, submission counts, disease names, and diagnostic notes are strictly excluded from the ML feature matrix.
            </p>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
              <Layers className="w-4 h-4 text-accent-sky" />
              <span>Preservation of Missingness Semantics</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unobserved variants in gnomAD are treated as biological missingness rather than arbitrarily coerced to zero frequency. 
              Missingness flags and native tree-split missingness paths in XGBoost preserve biological signal.
            </p>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Class Imbalance & PR-AUC Primacy</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Due to ascertainment bias in clinical databases, standard Accuracy and ROC-AUC can be misleading. 
              Our benchmark reporting will prioritize <strong>Precision-Recall AUC (PR-AUC)</strong>, Balanced Accuracy, and Brier calibration score.
            </p>
          </div>
        </div>
      </div>

      {/* Baseline Comparison Protocol */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-navy-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent-teal" />
            <h3 className="text-sm font-bold text-white">Planned Model Baseline Hierarchy</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Scikit-learn → XGBoost</span>
        </div>

        <div className="space-y-3">
          {plannedBaselines.map((base, idx) => (
            <div
              key={base.name}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-navy-950 border border-navy-800 gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-navy-800 text-cyan-400 font-mono text-[10px] flex items-center justify-center border border-navy-700">
                  {idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-slate-200 block">{base.name}</span>
                  <span className="text-[11px] text-slate-400">{base.role}</span>
                </div>
              </div>
              <span className="font-mono text-cyan-300 text-[11px] bg-navy-900 px-2.5 py-1 rounded border border-navy-750">
                Evaluation: {base.metric}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Diagnostic Disclaimer */}
      <div className="bg-navy-950 border border-navy-800 rounded-xl p-5 flex items-start gap-3 text-xs text-slate-400">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-slate-300 font-semibold block">Regulatory & Clinical Notice</strong>
          <p>
            {metadata?.disclaimer ||
              'VariantLens is an educational and exploratory computational research platform. It is NOT a clinical diagnostic tool and must not be used for medical decision making.'}
          </p>
        </div>
      </div>
    </div>
  );
};
