import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Info,
  ExternalLink,
  Sliders,
  AlertTriangle,
  Layers,
  BrainCircuit,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { predictVariant } from '../services/api';

// Lazy-load the heavy Mol* WebGL viewer to optimize initial bundle performance
const MolstarViewer = React.lazy(() =>
  import('../components/molstar/MolstarViewer').then((m) => ({ default: m.MolstarViewer }))
);

const CANONICAL_PROTEIN_MAP: Record<string, { accession: string; name: string; length: number; canonicalResidues?: Record<number, string> }> = {
  BRAF: {
    accession: 'P15056',
    name: 'Serine/threonine-protein kinase B-raf',
    length: 766,
    canonicalResidues: { 600: 'V', 469: 'G', 596: 'G' },
  },
  TP53: {
    accession: 'P04637',
    name: 'Cellular tumor antigen p53',
    length: 393,
    canonicalResidues: { 175: 'R', 248: 'R', 273: 'R', 282: 'R', 245: 'G' },
  },
  BRCA1: {
    accession: 'P38398',
    name: 'Breast cancer type 1 susceptibility protein',
    length: 1863,
    canonicalResidues: { 61: 'C', 1775: 'M' },
  },
  BRCA2: {
    accession: 'P51587',
    name: 'Breast cancer type 2 susceptibility protein',
    length: 3418,
    canonicalResidues: { 3326: 'K' },
  },
  KRAS: {
    accession: 'P01116',
    name: 'GTPase KRas',
    length: 189,
    canonicalResidues: { 12: 'G', 13: 'G', 61: 'Q' },
  },
  NRAS: {
    accession: 'P01111',
    name: 'GTPase NRas',
    length: 189,
    canonicalResidues: { 61: 'Q', 12: 'G' },
  },
  HRAS: {
    accession: 'P01112',
    name: 'GTPase HRas',
    length: 189,
    canonicalResidues: { 12: 'G', 61: 'Q' },
  },
  PTEN: {
    accession: 'P60484',
    name: 'Phosphatidylinositol 3,4,5-trisphosphate 3-phosphatase PTEN',
    length: 403,
    canonicalResidues: { 130: 'R' },
  },
  EGFR: {
    accession: 'P00533',
    name: 'Epidermal growth factor receptor',
    length: 1210,
    canonicalResidues: { 858: 'L', 790: 'T' },
  },
  LDLR: {
    accession: 'P01130',
    name: 'Low-density lipoprotein receptor',
    length: 860,
  },
  CFTR: {
    accession: 'P13569',
    name: 'Cystic fibrosis transmembrane conductance regulator',
    length: 1480,
    canonicalResidues: { 508: 'F', 551: 'G' },
  },
  VHL: {
    accession: 'P40337',
    name: 'Von Hippel-Lindau disease tumor suppressor',
    length: 213,
    canonicalResidues: { 167: 'R' },
  },
};

export const Protein3DPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const paramGene = searchParams.get('gene') || 'BRAF';
  const paramPos = searchParams.get('pos') || '600';
  const paramWt = searchParams.get('wt') || 'Val';
  const paramMut = searchParams.get('mut') || 'Glu';
  const paramUniprot = searchParams.get('uniprot') || '';

  const [gene, setGene] = useState(paramGene.toUpperCase());
  const [pos, setPos] = useState(paramPos);
  const [wt, setWt] = useState(paramWt);
  const [mut, setMut] = useState(paramMut);

  const [resolvedAccession, setResolvedAccession] = useState(paramUniprot || CANONICAL_PROTEIN_MAP[paramGene.toUpperCase()]?.accession || 'P15056');
  const [proteinName, setProteinName] = useState(CANONICAL_PROTEIN_MAP[paramGene.toUpperCase()]?.name || 'Human Kinase Protein');
  const [sequenceLength, setSequenceLength] = useState<number>(CANONICAL_PROTEIN_MAP[paramGene.toUpperCase()]?.length || 766);
  const [isResidueValid, setIsResidueValid] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate residue mapping and sequence offset against actual translated sequence
  useEffect(() => {
    const geneUpper = gene.toUpperCase();
    const mapped = CANONICAL_PROTEIN_MAP[geneUpper];
    const acc = paramUniprot || mapped?.accession || 'P15056';
    const pName = mapped?.name || `${geneUpper} protein`;
    const seqLen = mapped?.length || 1000;

    const numPos = parseInt(pos, 10);

    // Initial local baseline checks
    if (isNaN(numPos) || numPos < 1) {
      setIsResidueValid(false);
      setValidationError(`Invalid residue coordinate #${pos}. Protein residue position must be >= 1.`);
    } else if (seqLen && numPos > seqLen) {
      setIsResidueValid(false);
      setValidationError(
        `Residue coordinate #${numPos} exceeds canonical translated sequence length of ${seqLen} amino acids for ${geneUpper} (${acc}). Residue highlighting is disabled.`
      );
    } else if (mapped?.canonicalResidues && mapped.canonicalResidues[numPos]) {
      const expectedAa = mapped.canonicalResidues[numPos];
      // Compare 1-letter or first letter
      const inputFirstChar = wt.trim().charAt(0).toUpperCase();
      if (expectedAa !== inputFirstChar) {
        setIsResidueValid(false);
        setValidationError(
          `Residue mapping mismatch: Canonical Swiss-Prot sequence for ${geneUpper} (${acc}) has '${expectedAa}' at position #${numPos}, but query specified '${wt}'. Coordinate may derive from an alternate isoform or reading frame offset.`
        );
      } else {
        setIsResidueValid(true);
        setValidationError(null);
      }
    } else {
      setIsResidueValid(true);
      setValidationError(null);
    }

    setResolvedAccession(acc);
    setProteinName(pName);
    setSequenceLength(seqLen);

    // Live backend validation pass for full sequence checks
    predictVariant({
      gene_symbol: geneUpper,
      wild_type_aa: wt,
      mutant_aa: mut,
      protein_position: isNaN(numPos) ? 1 : numPos,
    })
      .then((res) => {
        if (res.biological_context) {
          const ctx = res.biological_context;
          if (ctx.uniprot_accession) setResolvedAccession(ctx.uniprot_accession);
          if (ctx.protein_name) setProteinName(ctx.protein_name);
          if (ctx.sequence_length) setSequenceLength(ctx.sequence_length);
          if (ctx.residue_verification) {
            setIsResidueValid(ctx.residue_verification.is_verified);
            setValidationError(ctx.residue_verification.warning_message || null);
          }
        }
      })
      .catch((err) => {
        console.warn('Backend residue mapping check note:', err);
      });
  }, [gene, pos, wt, mut, paramUniprot]);

  const plddtBands = [
    { label: 'Very High (pLDDT > 90)', color: 'bg-[#0C53B7]', desc: 'High accuracy backbone & side-chain orientation' },
    { label: 'Confident (90 > pLDDT > 70)', color: 'bg-[#5BC0DE]', desc: 'Reliable overall tertiary fold' },
    { label: 'Low (70 > pLDDT > 50)', color: 'bg-[#F0AD4E]', desc: 'Potential flexible loop or disordered boundary' },
    { label: 'Very Low (pLDDT < 50)', color: 'bg-[#D9534F]', desc: 'Intrinsically disordered or unstructured peptide region' },
  ];

  const benchmarks = [
    { label: 'BRAF V600E', gene: 'BRAF', pos: '600', wt: 'Val', mut: 'Glu', acc: 'P15056' },
    { label: 'TP53 R175H', gene: 'TP53', pos: '175', wt: 'Arg', mut: 'His', acc: 'P04637' },
    { label: 'BRCA1 C61G', gene: 'BRCA1', pos: '61', wt: 'Cys', mut: 'Gly', acc: 'P38398' },
    { label: 'PTEN R130G', gene: 'PTEN', pos: '130', wt: 'Arg', mut: 'Gly', acc: 'P60484' },
    { label: 'KRAS G12D', gene: 'KRAS', pos: '12', wt: 'Gly', mut: 'Asp', acc: 'P01116' },
  ];

  const handleSelectBenchmark = (b: typeof benchmarks[0]) => {
    setGene(b.gene);
    setPos(b.pos);
    setWt(b.wt);
    setMut(b.mut);
    setResolvedAccession(b.acc);
    setSearchParams({
      gene: b.gene,
      pos: b.pos,
      wt: b.wt,
      mut: b.mut,
      uniprot: b.acc,
    });
  };

  const cifUrl = `https://alphafold.ebi.ac.uk/files/AF-${resolvedAccession}-F1-model_v4.cif`;
  const pdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${resolvedAccession}-F1-model_v4.pdb`;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-xs font-mono text-cyan-400 mb-2">
            <Box className="w-3.5 h-3.5 text-accent-cyan" />
            <span>AlphaFold Protein Structure Database v4 Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span>3D Protein Molecular Viewer (Mol*)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Explore 3D AlphaFold models with validated residue mapping and residue-level pLDDT confidence coloring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-3 py-1.5 rounded-lg border border-cyan-800/60">
            UniProt: {resolvedAccession}
          </span>
          <a
            href={`https://alphafold.ebi.ac.uk/entry/${resolvedAccession}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-300 hover:text-white bg-navy-850 hover:bg-navy-800 px-3 py-1.5 rounded-lg border border-navy-750 flex items-center gap-1.5 transition-colors"
          >
            <span>AlphaFold DB</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Benchmark Selector Bar */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Sliders className="w-4 h-4 text-accent-cyan" />
          <span>Curated Benchmarks:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {benchmarks.map((b) => (
            <button
              key={b.label}
              onClick={() => handleSelectBenchmark(b)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors border ${
                gene === b.gene && pos === b.pos
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow-sm'
                  : 'bg-navy-950 text-slate-300 border-navy-800 hover:border-cyan-800'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Biological & Mapping Context */}
        <div className="space-y-5 lg:col-span-1">
          {/* Target Residue Context Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-4 shadow-md">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Target Mutation</span>
            </h3>

            <div className="bg-navy-950 p-4 rounded-lg border border-navy-800 text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg font-bold font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-1.5 rounded-lg border border-cyan-800">
                  {wt}
                </span>
                <span className="text-slate-500 font-mono text-xs">→</span>
                <span className="text-lg font-bold font-mono text-rose-300 bg-rose-950/80 px-2.5 py-1.5 rounded-lg border border-rose-800">
                  {mut}
                </span>
              </div>
              <span className="text-xs font-mono text-white block font-bold">
                Position #{pos}
              </span>
              <span className="text-[11px] text-slate-400 block truncate" title={proteinName}>
                {proteinName}
              </span>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Gene Symbol:</span>
                <span className="text-white font-mono font-bold">{gene}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">UniProt Accession:</span>
                <span className="text-cyan-300 font-mono">{resolvedAccession}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Canonical Chain Length:</span>
                <span className="text-slate-200 font-mono">{sequenceLength} aa</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Structure Source:</span>
                <span className="text-slate-200 font-mono">AlphaFold v4 (EBI)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-navy-800">
                <span className="text-slate-400">Sequence Verification:</span>
                <span className={`font-mono text-[11px] font-semibold ${isResidueValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isResidueValid ? 'Verified Residue' : 'Unverified Mapping'}
                </span>
              </div>
            </div>

            {/* Validation Notice when Mapping is Disputed or Exceeds Length */}
            {!isResidueValid && (
              <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-lg text-[11px] text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Highlighting Disabled</span>
                </div>
                <p className="leading-relaxed font-sans">{validationError}</p>
              </div>
            )}

            {/* Quick Navigation Links */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => navigate(`/prediction?gene=${gene}&pos=${pos}&wt=${wt}&mut=${mut}`)}
                className="w-full bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>View SHAP Prediction</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => navigate(`/evidence?q=${gene} ${wt}${pos}${mut}&gene=${gene}`)}
                className="w-full bg-navy-800 hover:bg-navy-750 text-slate-200 border border-navy-700 px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-accent-teal" />
                  <span>View ClinVar & Citations</span>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* pLDDT Confidence Legend Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 space-y-3 shadow-md">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-accent-teal" />
              <span>pLDDT Confidence Scale</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              {plddtBands.map((band) => (
                <div key={band.label} className="flex items-start gap-2.5">
                  <span className={`w-3.5 h-3.5 rounded mt-0.5 shrink-0 ${band.color}`} />
                  <div>
                    <span className="text-slate-200 font-semibold block text-[11px]">{band.label}</span>
                    <span className="text-slate-400 text-[10px] leading-tight block">{band.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Crucial Scientific Warning on pLDDT vs Pathogenicity */}
            <div className="bg-navy-950 p-3 rounded-lg border border-navy-800 space-y-1.5 text-[11px] text-slate-300 font-sans mt-3">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>pLDDT vs Pathogenicity</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                <strong>Critical distinction:</strong> pLDDT measures local structural ordering and model confidence. A high pLDDT score (&gt;90) indicates well-folded structural coordinates, <em>not</em> clinical pathogenicity. Disordered or flexible loops often exhibit low pLDDT scores regardless of variant effect.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Lazy-Loaded Mol* WebGL Viewer */}
        <div className="lg:col-span-3 space-y-4">
          <Suspense
            fallback={
              <div className="w-full h-[580px] bg-[#070C18] rounded-xl border border-navy-800 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-sm font-semibold text-white block">Initializing Mol* WebGL Viewer...</span>
                <span className="text-xs text-slate-400 font-mono block">Loading component chunk dynamically</span>
              </div>
            }
          >
            <MolstarViewer
              uniprotAccession={resolvedAccession}
              cifUrl={cifUrl}
              pdbUrl={pdbUrl}
              targetResidue={parseInt(pos, 10)}
              wildTypeAa={wt}
              mutantAa={mut}
              isResidueValid={isResidueValid}
              validationError={validationError}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
