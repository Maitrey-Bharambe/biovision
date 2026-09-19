'use client';

export function DnaStrand({ sequence = '', wrap = 60, showLegend = true }) {
  if (!sequence) return <div className="text-muted text-sm">No sequence.</div>;
  const rows = [];
  for (let i = 0; i < sequence.length; i += wrap) rows.push(sequence.slice(i, i + wrap));
  return (
    <div className="space-y-2">
      <div className="dna text-sm leading-6 scrollbox bg-white/60 rounded-2xl p-4 border border-border/60">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-3">
            <span className="text-muted text-xs w-14 tabular-nums text-right shrink-0">{ri * wrap + 1}</span>
            <span>
              {row.split('').map((b, bi) => (
                <span key={bi} className={`nuc-${b}`}>{b}</span>
              ))}
            </span>
          </div>
        ))}
      </div>
      {showLegend && (
        <div className="flex gap-4 text-[11px] text-muted pt-1">
          <span><span className="nuc-A">A</span> adenine</span>
          <span><span className="nuc-C">C</span> cytosine</span>
          <span><span className="nuc-G">G</span> guanine</span>
          <span><span className="nuc-T">T</span> thymine</span>
        </div>
      )}
    </div>
  );
}
