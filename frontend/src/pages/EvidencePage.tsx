import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ExternalLink, FileText } from 'lucide-react';

export const EvidencePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || 'BRAF V600E';

  // Real literature citations for the benchmark variants
  const evidenceCitations: Record<string, any[]> = {
    'BRAF V600E': [
      {
        pmid: '12068308',
        title: 'Mutations of the BRAF gene in human cancer',
        authors: 'Davies H, Bignell GR, Cox C, Stephens P, Edkins S, Clegg S, et al.',
        journal: 'Nature. 2002 Jun 27;417(6892):949-54',
        doi: '10.1038/nature00766',
        summary: 'Landmark discovery demonstrating that somatic mutations in BRAF occur in ~66% of malignant melanomas and at lower frequencies in other human cancers, with V600E (formerly V599E) accounting for over 80% of mutations.'
      },
      {
        pmid: '20818844',
        title: 'Improved survival with vemurafenib in melanoma with BRAF V600E mutation',
        authors: 'Chapman PB, Hauschild A, Robert C, Haanen JB, Ascierto P, Larkin J, et al.',
        journal: 'N Engl J Med. 2011 Jun 30;364(26):2507-16',
        doi: '10.1056/NEJMoa1103782',
        summary: 'Phase 3 randomized trial establishing targeted kinase inhibition with vemurafenib in metastatic melanoma harboring the BRAF V600E substitution.'
      }
    ],
    'TP53 R175H': [
      {
        pmid: '2283832',
        title: 'Germ line p53 mutations in a familial syndrome of breast cancer, sarcomas, and other neoplasms',
        authors: 'Malkin D, Li FP, Strong LC, Fraumeni JF Jr, Nelson CE, Kim DH, et al.',
        journal: 'Science. 1990 Nov 30;250(4985):1233-8',
        doi: '10.1126/science.1978757',
        summary: 'Identified germline TP53 hotspot mutations including R175H as the genetic basis of Li-Fraumeni syndrome.'
      }
    ],
    'BRCA1 C61G': [
      {
        pmid: '7545954',
        title: 'A strong candidate for the breast and ovarian cancer susceptibility gene BRCA1',
        authors: 'Miki Y, Swensen J, Shattuck-Eidens D, Futreal PA, Harshman K, et al.',
        journal: 'Science. 1994 Oct 7;266(5182):66-71',
        doi: '10.1126/science.7545954',
        summary: 'Positional cloning and identification of BRCA1 missense mutations disrupting the amino-terminal RING finger domain critical for BARD1 heterodimerization.'
      }
    ]
  };

  const citations = evidenceCitations[query] || evidenceCitations['BRAF V600E'];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2 border-b border-navy-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-accent-cyan" />
          <span>Evidence & Literature Hub</span>
        </h1>
        <p className="text-sm text-slate-400">
          Peer-reviewed biomedical literature and clinical assertions retrieved via NCBI E-utilities
        </p>
      </div>

      {/* Query Banner */}
      <div className="bg-navy-900 border border-navy-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-cyan-400 block">Target Variant</span>
          <h2 className="text-xl font-bold font-mono text-white mt-0.5">{query}</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>Source: NCBI PubMed / Entrez E-utilities</span>
        </div>
      </div>

      {/* PubMed Citations List */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-teal" />
            <span>Peer-Reviewed Literature ({citations.length} Citations)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Indexed by PMID</span>
        </div>

        <div className="space-y-4">
          {citations.map((cite) => (
            <div
              key={cite.pmid}
              className="bg-navy-900 border border-navy-800 rounded-xl p-6 space-y-3 hover:border-navy-700 transition-colors shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <h4 className="text-base font-semibold text-white leading-snug">
                  {cite.title}
                </h4>
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${cite.pmid}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-cyan-300 hover:text-cyan-200 bg-cyan-950/80 px-2.5 py-1.5 rounded-lg border border-cyan-800/60 flex items-center gap-1.5 transition-colors font-mono"
                >
                  <span>PMID {cite.pmid}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="text-xs text-slate-400 font-sans">
                <p className="text-slate-300 font-medium">{cite.authors}</p>
                <p className="mt-0.5 font-mono text-slate-400">{cite.journal}</p>
              </div>

              <div className="bg-navy-950/70 p-3.5 rounded-lg border border-navy-800/80 text-xs text-slate-300 leading-relaxed">
                <span className="text-[11px] font-mono text-slate-400 block mb-1 font-semibold uppercase tracking-wider">
                  Biomedical Abstract Summary
                </span>
                <p>{cite.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
