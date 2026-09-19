'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * A 3-D-looking DNA double helix in pure SVG.
 * Rotates around its long axis; the two sugar-phosphate backbones sweep
 * through depth via z-scaled ellipses + base-pair rungs.
 *
 *   nucleotides     — colored ATCG letters on the strands (from `sequence`)
 *   highlight       — index of a nucleotide to spotlight (glowing + labeled)
 *
 * No external deps — safe for any project.
 */
export function Dna3D({
  sequence = 'ATGCGTAGCTAGCTAGCGTATCG',
  height   = 380,
  width    = 260,
  highlight = null,
  spinSeconds = 12,
  showLegend  = true,
}) {
  const [t, setT] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    let start = performance.now();
    const tick = (now) => {
      setT(((now - start) / 1000 / spinSeconds) * Math.PI * 2);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [spinSeconds]);

  const N       = Math.min(sequence.length, 20);              // rungs to draw
  const cx      = width / 2;
  const yTop    = 20;
  const yBot    = height - 20;
  const step    = (yBot - yTop) / (N - 1);
  const radius  = width * 0.30;

  // Precompute rung geometry with rotation `t`
  const rungs = [];
  for (let i = 0; i < N; i++) {
    const y  = yTop + i * step;
    const a  = t + (i / N) * Math.PI * 4;
    const xa = cx + radius * Math.cos(a);
    const xb = cx + radius * Math.cos(a + Math.PI);
    const za = Math.sin(a);                                   // -1..1  → depth
    const zb = Math.sin(a + Math.PI);
    rungs.push({ i, y, xa, xb, za, zb, letter: sequence[i % sequence.length] });
  }

  // Sort rungs back-to-front so front strand overlays back strand
  const sorted = [...rungs].sort((r1, r2) =>
    Math.max(r1.za, r1.zb) - Math.max(r2.za, r2.zb));

  const nucColor = { A:'#2f6df1', C:'#e0526d', G:'#1fb885', T:'#e0a021' };
  const complement = { A:'T', T:'A', C:'G', G:'C' };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}
           style={{ maxWidth: '100%' }}>
        <defs>
          <linearGradient id="dna3d-strandA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#5eddec"/>
            <stop offset="100%" stopColor="#0b5e68"/>
          </linearGradient>
          <linearGradient id="dna3d-strandB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#8bf0da"/>
            <stop offset="100%" stopColor="#0a2540"/>
          </linearGradient>
          <linearGradient id="dna3d-rung" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0ea5b7"/>
            <stop offset="100%" stopColor="#7fe3d4"/>
          </linearGradient>
          <radialGradient id="dna3d-bead" cx="35%" cy="35%">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Faint ring shadow behind the helix */}
        <ellipse cx={cx} cy={height - 10} rx={radius * 1.3} ry="5"
                 fill="#0a2540" opacity="0.10"/>

        {/* Continuous strand paths (SPLINE through all rungs) */}
        {(() => {
          const ptsA = rungs.map(r => `${r.xa},${r.y}`).join(' L ');
          const ptsB = rungs.map(r => `${r.xb},${r.y}`).join(' L ');
          return (
            <>
              <path d={`M ${ptsA}`} fill="none" stroke="url(#dna3d-strandA)"
                    strokeWidth="4.5" strokeLinecap="round" opacity="0.9"/>
              <path d={`M ${ptsB}`} fill="none" stroke="url(#dna3d-strandB)"
                    strokeWidth="4.5" strokeLinecap="round" opacity="0.9"/>
            </>
          );
        })()}

        {/* Rungs + nucleotide beads (back-to-front) */}
        {sorted.map(r => {
          const isHi = highlight !== null && highlight === r.i;
          const rungOpacity = 0.30 + 0.55 * (1 - Math.abs(Math.min(r.za, r.zb)));
          const beadRA = 5 + 2.2 * r.za;                     // depth-scaled bead
          const beadRB = 5 + 2.2 * r.zb;
          const base    = r.letter;
          const baseC   = complement[base] || 'A';
          return (
            <g key={r.i} opacity={isHi ? 1 : rungOpacity + 0.05}>
              <line x1={r.xa} y1={r.y} x2={r.xb} y2={r.y}
                    stroke={isHi ? '#e56b8f' : 'url(#dna3d-rung)'}
                    strokeWidth={isHi ? 4 : 2.2}
                    strokeLinecap="round" opacity={isHi ? 1 : rungOpacity}/>

              {/* Nucleotide beads */}
              <circle cx={r.xa} cy={r.y} r={Math.max(3, beadRA)}
                      fill={nucColor[base] || '#0ea5b7'}
                      stroke={isHi ? '#e56b8f' : 'white'}
                      strokeWidth={isHi ? 2 : 1}/>
              <circle cx={r.xa} cy={r.y} r={Math.max(1.5, beadRA * 0.5)}
                      fill="url(#dna3d-bead)"/>

              <circle cx={r.xb} cy={r.y} r={Math.max(3, beadRB)}
                      fill={nucColor[baseC] || '#0ea5b7'}
                      stroke={isHi ? '#e56b8f' : 'white'}
                      strokeWidth={isHi ? 2 : 1}/>
              <circle cx={r.xb} cy={r.y} r={Math.max(1.5, beadRB * 0.5)}
                      fill="url(#dna3d-bead)"/>

              {isHi && (
                <>
                  <text x={r.xa} y={r.y - 8} fontSize="9" fill="#e56b8f"
                        textAnchor="middle" fontWeight="700">{base}</text>
                  <text x={r.xb} y={r.y - 8} fontSize="9" fill="#e56b8f"
                        textAnchor="middle" fontWeight="700">{baseC}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="flex gap-3 text-[10px] text-muted">
          {Object.entries(nucColor).map(([b, c]) => (
            <span key={b} className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: c }}/>{b}
            </span>
          ))}
          <span className="opacity-70">· rotating helix</span>
        </div>
      )}
    </div>
  );
}
