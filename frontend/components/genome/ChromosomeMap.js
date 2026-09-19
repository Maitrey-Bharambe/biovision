'use client';

export function ChromosomeMap({ chromosome, genes = [], mutations = [], selectedGene, onSelectGene }) {
  if (!chromosome) return <div className="text-muted text-sm">Select a chromosome.</div>;

  const width = 900, height = 130, pad = 40;
  const length = chromosome.length_bp || 1;
  const xOf = (pos) => pad + ((pos || 0) / length) * (width - 2 * pad);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="chrGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"  stopColor="#7fe3d4" />
            <stop offset="50%" stopColor="#0ea5b7" />
            <stop offset="100%" stopColor="#4dd0e1" />
          </linearGradient>
          <filter id="chrShadow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="3"/>
          </filter>
        </defs>

        {/* soft chromosome shadow */}
        <rect x={pad-2} y={height/2 - 4} width={width - 2*pad + 4} height={16}
              rx={8} fill="#0a2540" opacity="0.08" filter="url(#chrShadow)"/>

        {/* chromosome bar */}
        <rect x={pad} y={height/2 - 8} width={width - 2*pad} height={16}
              rx={8} fill="url(#chrGrad)" stroke="rgba(10,37,64,0.15)" strokeWidth="1"/>

        {/* centromere */}
        <circle cx={pad + (width - 2*pad) * 0.45} cy={height/2}
                r={9} fill="#ffffff" stroke="#0ea5b7" strokeWidth="1.5" />

        {/* genes */}
        {genes.map((g, i) => {
          const cx = xOf(g.start ?? g.start_position ?? 0);
          const active = selectedGene && g.gene_name === selectedGene;
          return (
            <g key={i} className="cursor-pointer" onClick={() => onSelectGene?.(g.gene_name)}>
              <line x1={cx} y1={height/2 - 14} x2={cx} y2={height/2 + 14}
                    stroke={active ? '#0a2540' : '#0a2540'}
                    strokeWidth={active ? 3 : 1.2}
                    opacity={active ? 1 : 0.65} />
              <text x={cx} y={height/2 - 20} textAnchor="middle" fontSize="10"
                    fill={active ? '#0a2540' : '#5b7594'}
                    fontWeight={active ? 600 : 500}>
                {g.gene_name || g.name}
              </text>
            </g>
          );
        })}

        {/* mutations */}
        {mutations.map((m, i) => {
          const cx = xOf(m.position);
          return (
            <circle key={i} cx={cx} cy={height/2 + 28} r={3.5} fill="#e56b8f" opacity={0.9}>
              <title>{`${m.mutation_id} ${m.type} ${m.ref}>${m.alt}`}</title>
            </circle>
          );
        })}

        {/* axis */}
        <text x={pad} y={height - 8} fontSize="10" fill="#5b7594">0</text>
        <text x={width - pad} y={height - 8} fontSize="10" fill="#5b7594" textAnchor="end">
          {(length / 1e6).toFixed(1)} Mb
        </text>

        <text x={pad} y={22} fontSize="12" fill="#0a2540" fontWeight="600">
          Chromosome {chromosome.chromosome_number}
        </text>
      </svg>

      <div className="flex gap-4 text-[11px] text-muted mt-1">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-0.5 h-3 bg-deep" /> Genes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-rose" /> Mutations
        </span>
      </div>
    </div>
  );
}
