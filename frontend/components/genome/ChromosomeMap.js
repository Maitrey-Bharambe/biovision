'use client';

export function ChromosomeMap({ chromosome, genes = [], mutations = [], selectedGene, onSelectGene }) {
  if (!chromosome) return <div className="meta">Select a chromosome.</div>;

  const width = 900, height = 130, pad = 40;
  const length = chromosome.length_bp || 1;
  const xOf = (pos) => pad + ((pos || 0) / length) * (width - 2 * pad);

  return (
    <div className="w-full overflow-x-auto border border-ink bg-subtle">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* chromosome bar — flat ink with hatched centromere break */}
        <rect x={pad} y={height/2 - 8} width={width - 2*pad} height={16}
              fill="#FFFFFF" stroke="#111111" strokeWidth="1.2"/>

        {/* centromere */}
        <rect x={pad + (width - 2*pad) * 0.45 - 6} y={height/2 - 10}
              width={12} height={20} fill="#111111"/>

        {/* genes */}
        {genes.map((g, i) => {
          const cx = xOf(g.start ?? g.start_position ?? 0);
          const active = selectedGene && g.gene_name === selectedGene;
          return (
            <g key={i} className="cursor-pointer" onClick={() => onSelectGene?.(g.gene_name)}>
              <line x1={cx} y1={height/2 - 14} x2={cx} y2={height/2 + 14}
                    stroke={active ? '#CC0000' : '#111111'}
                    strokeWidth={active ? 2.5 : 1} />
              <text x={cx} y={height/2 - 20} textAnchor="middle" fontSize="10"
                    fontFamily="JetBrains Mono"
                    fill={active ? '#CC0000' : '#525252'}
                    fontWeight={active ? 700 : 500}>
                {g.gene_name || g.name}
              </text>
            </g>
          );
        })}

        {/* mutations as small squares */}
        {mutations.map((m, i) => {
          const cx = xOf(m.position);
          return (
            <rect key={i} x={cx-3} y={height/2 + 24} width={6} height={6} fill="#CC0000">
              <title>{`${m.mutation_id} ${m.type} ${m.ref}>${m.alt}`}</title>
            </rect>
          );
        })}

        {/* axis */}
        <text x={pad} y={height - 8} fontSize="10" fill="#525252" fontFamily="JetBrains Mono">0</text>
        <text x={width - pad} y={height - 8} fontSize="10" fill="#525252"
              fontFamily="JetBrains Mono" textAnchor="end">
          {(length / 1e6).toFixed(1)} Mb
        </text>

        <text x={pad} y={22} fontSize="11" fill="#111111"
              fontFamily="Inter" fontWeight="700" letterSpacing="2">
          CHR {chromosome.chromosome_number}
        </text>
      </svg>

      <div className="flex gap-4 meta !text-[10px] mt-1 px-3 pb-2 border-t border-ink pt-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 bg-ink" /> Genes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 bg-accent" /> Mutations
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-ink" /> Centromere
        </span>
      </div>
    </div>
  );
}
