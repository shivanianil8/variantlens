import React, { useEffect, useState } from 'react';
import {
  Info,
  ShieldCheck,
  Layers,
  AlertTriangle,
  Scale,
  BrainCircuit,
  BarChart2,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { fetchModelMetadata } from '../services/api';
import { ModelMetadataResponse } from '../types/variant';

export const AboutModelPage: React.FC = () => {
  const [metadata, setMetadata] = useState<ModelMetadataResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'shap' | 'structural' | 'safeguards'>('metrics');

  useEffect(() => {
    fetchModelMetadata()
      .then(setMetadata)
      .catch((err) => console.error('Error loading model metadata:', err));
  }, []);

  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="space-y-2 border-b border-navy-800 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-xs font-mono text-cyan-400 mb-1">
          <Info className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Scientific Model Card & Offline Cross-Validation Audit</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <span>About the VariantLens Predictive Model</span>
        </h1>
        <p className="text-sm text-slate-400">
          Official architecture card, 5-fold gene-held-out evaluation results, leakage safeguards, and biological feature importance.
        </p>
      </div>

      {/* Model Overview Card */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-3">
          <div>
            <span className="text-xs font-mono text-slate-400">Production Model Specification</span>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-accent-cyan" />
              <span>{metadata?.model_name || 'VariantLens XGBoost Pathogenicity Predictor'}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded border border-emerald-800 font-semibold">
              Status: Production Ready (v{metadata?.model_version || '1.0.0'})
            </span>
          </div>
        </div>

        {/* High-Level Cohort Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Training Cohort</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {metadata?.training_cohort_size?.toLocaleString() || '202,575'}
            </span>
            <span className="text-[10px] text-slate-400 block">Missense SNVs (≥1 Star)</span>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Unique Genes</span>
            <span className="text-2xl font-bold font-mono text-cyan-300 mt-1 block">15,310</span>
            <span className="text-[10px] text-slate-400 block">15,115 Disjoint Groups</span>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Pathogenic Prevalence</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
              {((metadata?.positive_class_prevalence || 0.3054) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 block">61,858 Pathogenic</span>
          </div>

          <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Benign Cohort</span>
            <span className="text-2xl font-bold font-mono text-sky-400 mt-1 block">69.5%</span>
            <span className="text-[10px] text-slate-400 block">140,717 Benign</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          <strong>Methodological Provenance:</strong> Trained exclusively on the official NCBI ClinVar release (Nov 1, 2026; SHA256: <code className="text-cyan-300 bg-navy-950 px-1 py-0.5 rounded font-mono text-[10px]">7c39f2d8...</code>). 
          Zero-star variants (16,143), VUS, and conflicting clinical interpretations were strictly isolated from supervised training partitions.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-navy-800 pb-2">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors border ${
            activeTab === 'metrics'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
              : 'bg-navy-900 text-slate-400 border-navy-800 hover:text-white'
          }`}
        >
          Out-of-Fold Baseline Comparison
        </button>
        <button
          onClick={() => setActiveTab('shap')}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors border ${
            activeTab === 'shap'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
              : 'bg-navy-900 text-slate-400 border-navy-800 hover:text-white'
          }`}
        >
          Global TreeSHAP Importance
        </button>
        <button
          onClick={() => setActiveTab('structural')}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors border ${
            activeTab === 'structural'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
              : 'bg-navy-900 text-slate-400 border-navy-800 hover:text-white'
          }`}
        >
          AlphaFold Structural Experiment
        </button>
        <button
          onClick={() => setActiveTab('safeguards')}
          className={`px-4 py-2 rounded-lg text-xs font-mono transition-colors border ${
            activeTab === 'safeguards'
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 font-bold'
              : 'bg-navy-900 text-slate-400 border-navy-800 hover:text-white'
          }`}
        >
          Leakage Safeguards & Caveats
        </button>
      </div>

      {/* TAB 1: Baseline Comparison & Official Metrics */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-accent-cyan" />
                  <span>Out-of-Fold 5-Fold Cross-Validation Benchmark</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pre-processing and scaling fitted strictly on training folds; evaluation computed on held-out gene groups.
                </p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800">
                Random Baseline PR-AUC: 0.3054
              </span>
            </div>

            {/* Metrics Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-navy-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Model Architecture</th>
                    <th className="py-2.5 px-3 text-right">ROC-AUC</th>
                    <th className="py-2.5 px-3 text-right">PR-AUC (Avg Prec)</th>
                    <th className="py-2.5 px-3 text-right">Balanced Acc</th>
                    <th className="py-2.5 px-3 text-right">Brier Score</th>
                    <th className="py-2.5 px-3 text-right">Recall (≥0.5)</th>
                    <th className="py-2.5 px-3 text-right">Precision (≥0.5)</th>
                    <th className="py-2.5 px-3 text-right">F1-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-850">
                  {/* Dummy Baseline */}
                  <tr className="hover:bg-navy-850/50">
                    <td className="py-3 px-3 font-semibold text-slate-300 font-mono">
                      Dummy Majority Prior
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.5000</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.2941</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.5000</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.2123</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.0000</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.0000</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">0.0000</td>
                  </tr>

                  {/* Logistic Regression */}
                  <tr className="hover:bg-navy-850/50">
                    <td className="py-3 px-3 font-semibold text-slate-200 font-mono">
                      Logistic Regression (L2)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.7162 ± 0.007</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.5321 ± 0.028</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.6612</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.2131</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.6342</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.4720</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">0.5412</td>
                  </tr>

                  {/* Random Forest */}
                  <tr className="hover:bg-navy-850/50">
                    <td className="py-3 px-3 font-semibold text-slate-200 font-mono">
                      Random Forest (100 Trees)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300 font-medium">0.7993 ± 0.009</td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300 font-medium">0.6475 ± 0.019</td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300">0.7242</td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300">0.1802</td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300">0.6720</td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300">0.5692</td>
                    <td className="py-3 px-3 text-right font-mono text-teal-300">0.6163</td>
                  </tr>

                  {/* XGBoost Primary */}
                  <tr className="bg-cyan-950/30 border-l-2 border-cyan-400">
                    <td className="py-3 px-3 font-bold text-white font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>XGBoost (Scale Pos Weight 2.275)</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.8076 ± 0.008</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.6576 ± 0.018</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.7327</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.1765</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.7100</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.5607</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">0.6266</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 text-[11px] text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Key Takeaway:</strong> With a pathogenic positive prevalence of 30.54%, XGBoost achieves a PR-AUC of <strong>0.6576</strong> (+0.3522 lift over random baseline) and low Brier score of <strong>0.1765</strong>.
              </span>
            </div>
          </div>

          {/* Actual Saved Experiment Plots from Backend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Out-of-Fold Receiver Operating Characteristic (ROC)</span>
              </h4>
              <div className="rounded-lg overflow-hidden border border-navy-800 bg-[#070C18]">
                <img
                  src="/api/artifacts/visualizations/roc_curves.png"
                  alt="Out-of-fold ROC curves"
                  className="w-full h-auto object-contain hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                XGBoost ROC-AUC: 0.8076 • Random Forest: 0.7993 • Logistic Regression: 0.7162
              </span>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-accent-teal" />
                <span>Out-of-Fold Precision-Recall (PR) Curves</span>
              </h4>
              <div className="rounded-lg overflow-hidden border border-navy-800 bg-[#070C18]">
                <img
                  src="/api/artifacts/visualizations/pr_curves.png"
                  alt="Out-of-fold Precision-Recall curves"
                  className="w-full h-auto object-contain hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                XGBoost PR-AUC: 0.6576 (Base prevalence: 0.3054)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Global TreeSHAP Feature Ranking */}
      {activeTab === 'shap' && (
        <div className="space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-navy-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-accent-teal" />
                <span>Global TreeSHAP Importance & Directional Attributions</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact Shapley values averaged across background variants from the gene-held-out XGBoost model.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-navy-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-2.5 px-3">Global Rank</th>
                    <th className="py-2.5 px-3">Biological Feature</th>
                    <th className="py-2.5 px-3 text-right">Mean |SHAP|</th>
                    <th className="py-2.5 px-3">Primary Directional Impact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-850">
                  {metadata?.tree_shap_global_ranking?.map((item) => (
                    <tr key={item.feature_name} className="hover:bg-navy-850/50">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">#{item.rank}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-white block">{item.display_name}</span>
                        <code className="text-[10px] text-slate-400 font-mono">{item.feature_name}</code>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-cyan-300">
                        {item.mean_abs_shap.toFixed(4)}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-md leading-relaxed">
                        {item.directional_summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SHAP Summary & Dependence Plot Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 font-semibold">
                TreeSHAP Summary Distribution Plot
              </h4>
              <div className="rounded-lg overflow-hidden border border-navy-800 bg-[#070C18]">
                <img
                  src="/api/artifacts/visualizations/shap_summary.png"
                  alt="TreeSHAP summary plot"
                  className="w-full h-auto object-contain hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>

            <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-wider text-slate-300 font-semibold">
                SHAP Dependence Plots (Interaction Terms)
              </h4>
              <div className="rounded-lg overflow-hidden border border-navy-800 bg-[#070C18]">
                <img
                  src="/api/artifacts/visualizations/shap_dependence_plots.png"
                  alt="SHAP dependence plots"
                  className="w-full h-auto object-contain hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AlphaFold Structural Subset Experiment */}
      {activeTab === 'structural' && (
        <div className="space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-navy-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-accent-cyan" />
                <span>AlphaFold Structural Subset Experiment (2,383 Variants Across 14 Genes)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Strict 5-fold gene-held-out cross-validation comparing 7 Core Features vs 8 Features (+ AlphaFold pLDDT) on identical fold splits.
              </p>
            </div>

            {/* Performance Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Core Features (OOF)</span>
                <span className="text-2xl font-bold font-mono text-slate-200 mt-1 block">
                  {metadata?.structural_experiment?.core_features_oof?.roc_auc?.toFixed(4) || '0.6372'}
                </span>
                <span className="text-[10px] text-slate-400 block">PR-AUC: 0.8856</span>
              </div>

              <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Core + pLDDT (OOF)</span>
                <span className="text-2xl font-bold font-mono text-cyan-300 mt-1 block">
                  {metadata?.structural_experiment?.extended_features_oof_plddt?.roc_auc?.toFixed(4) || '0.6569'}
                </span>
                <span className="text-[10px] text-slate-400 block">PR-AUC: 0.8888</span>
              </div>

              <div className="bg-navy-950 p-4 rounded-xl border border-navy-800 text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Generalization Lift</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  +{metadata?.structural_experiment?.delta_roc_auc?.toFixed(4) || '+0.0196'}
                </span>
                <span className="text-[10px] text-slate-400 block">Structural Order Gain</span>
              </div>
            </div>

            {/* Important Scientific Selection Bias Caveat */}
            <div className="bg-amber-950/30 border border-amber-800/80 p-4 rounded-xl text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Selection Bias & Generalization Caveats</span>
              </div>
              <p className="leading-relaxed font-sans text-slate-300">
                <strong>Cohort Composition:</strong> The structural subset is composed of 2,383 missense variants concentrated in 14 heavily studied monogenic disease and cancer genes (<em>CFTR, LDLR, TP53, HRAS, BRAF, VHL, KRAS, PTEN, NRAS, SMAD4, CDKN2A, RB1, EGFR, AKT1</em>). 
                The positive class prevalence in this subset is extraordinarily high (85.8% to 96.1% pathogenic across folds), contrasting sharply with the 30.54% prevalence in the full 202,575-variant cohort.
              </p>
              <p className="leading-relaxed font-sans text-slate-400 text-[11px]">
                Consequently, while an in-sample fit yields an AUC of 0.9832, under rigorous <strong>gene-held-out cross-validation</strong>, the actual generalization AUC is <strong>0.6372 (Core) vs 0.6569 (+ pLDDT)</strong>, demonstrating a modest but statistically genuine +0.0196 discriminative boost from AlphaFold residue ordering.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Leakage Safeguards & Model Limitations */}
      {activeTab === 'safeguards' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leakage Safeguards */}
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-navy-800 pb-3 text-cyan-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-accent-cyan" />
                <span>Implemented Leakage Safeguards</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 font-sans">
                {metadata?.leakage_safeguards?.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Model Limitations */}
            <div className="bg-navy-900 border border-navy-800 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-navy-800 pb-3 text-amber-300 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Explicit Model Limitations</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-300 font-sans">
                {metadata?.model_limitations?.map((lim, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Regulatory Disclaimer Banner */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 shadow-lg space-y-2">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
              Regulatory Non-Diagnostic Disclaimer
            </span>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {metadata?.disclaimer ||
                'VariantLens is an educational and exploratory computational research platform. It is NOT a medical diagnostic tool and must not be used for clinical decision making.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
