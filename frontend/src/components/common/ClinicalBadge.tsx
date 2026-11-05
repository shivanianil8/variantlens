import React from 'react';
import { Star } from 'lucide-react';

interface ClinicalBadgeProps {
  significance: string;
  stars?: number;
  className?: string;
  isMLPrediction?: boolean;
}

export const ClinicalBadge: React.FC<ClinicalBadgeProps> = ({
  significance,
  stars = 0,
  className = '',
  isMLPrediction = false
}) => {
  const sigLower = significance.toLowerCase();

  let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';

  if (sigLower.includes('pathogenic') && !sigLower.includes('likely')) {
    badgeColor = 'bg-rose-950/70 text-rose-300 border-rose-800/80';
    dotColor = 'bg-rose-500';
  } else if (sigLower.includes('likely pathogenic')) {
    badgeColor = 'bg-rose-950/50 text-rose-300 border-rose-700/60';
    dotColor = 'bg-rose-400';
  } else if (sigLower.includes('benign') && !sigLower.includes('likely')) {
    badgeColor = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80';
    dotColor = 'bg-emerald-500';
  } else if (sigLower.includes('likely benign')) {
    badgeColor = 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60';
    dotColor = 'bg-emerald-400';
  } else if (sigLower.includes('uncertain') || sigLower.includes('vus')) {
    badgeColor = 'bg-amber-950/70 text-amber-300 border-amber-800/80';
    dotColor = 'bg-amber-400';
  } else if (sigLower.includes('conflicting')) {
    badgeColor = 'bg-orange-950/70 text-orange-300 border-orange-800/80';
    dotColor = 'bg-orange-400';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeColor} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      <span>{significance}</span>
      
      {!isMLPrediction && (
        <div className="flex items-center gap-0.5 ml-1 border-l border-slate-700/60 pl-1.5" title={`${stars} ClinVar Review Stars`}>
          {[...Array(4)].map((_, i) => (
            <Star
              key={i}
              className={`w-3 h-3 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
            />
          ))}
        </div>
      )}

      {isMLPrediction && (
        <span className="text-[10px] px-1 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-800/60 font-mono">
          In Silico ML
        </span>
      )}
    </div>
  );
};
