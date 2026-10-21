'use client';
import { useMemo } from 'react';

/**
 * Force-free "hub" layout for association rules:
 *   • every unique token is a node placed on a circle
 *   • every rule (antecedent → consequent) draws an edge with thickness ∝ lift
 *   • hovering a node highlights its edges
 *
 * Not a physics simulation — deterministic, always renders identically.
 */
export function AssociationGraph({ rules = [], width = 720, height = 460 }) {
  const { nodes, edges } = useMemo(() => {
    const nodeSet = new Set();
    const eds = [];
    rules.slice(0, 40).forEach((r, i) => {
      const from = r.antecedents.join(' + ');
      const to   = r.consequents.join(' + ');
      nodeSet.add(from); nodeSet.add(to);
      eds.push({ from, to, lift: r.lift, confidence: r.confidence, support: r.support });
    });
    const arr = [...nodeSet];
    const cx = width / 2, cy = height / 2, R = Math.min(width, height) / 2 - 40;
    const nds = arr.map((label, i) => {
      const a = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
      return { id: label, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    return { nodes: nds, edges: eds };
  }, [rules, width, height]);

  if (!rules.length) return <div className="meta">No rules to plot.</div>;

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const maxLift = Math.max(1.5, ...edges.map(e => e.lift || 1));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4"
                orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8" fill="#111111"/>
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = nodeMap[e.from], b = nodeMap[e.to];
        if (!a || !b) return null;
        const w = 0.5 + 3.5 * ((e.lift || 1) / maxLift);
        return (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="#111111"
                strokeOpacity={0.25 + 0.6 * (e.confidence || 0)}
                strokeWidth={w}
                markerEnd="url(#arrow)">
            <title>{`${e.from}  →  ${e.to}
support ${e.support}   confidence ${e.confidence}   lift ${e.lift}`}</title>
          </line>
        );
      })}
      {nodes.map((n, i) => {
        const [head] = n.id.split(':');
        const palette = {
          mut: '#CC0000', expr: '#1F4E79', disease: '#111111', condition: '#AD6A1A',
        };
        const fill = palette[head] || '#525252';
        const short = n.id.length > 22 ? n.id.slice(0, 20) + '…' : n.id;
        return (
          <g key={i}>
            <rect x={n.x-5} y={n.y-5} width="10" height="10" fill={fill} stroke="#111111"/>
            <rect x={n.x + 10} y={n.y - 9} width={short.length * 6.5 + 8} height="18"
                  fill="#FFFFFF" stroke="#111111"/>
            <text x={n.x + 14} y={n.y + 4} fontSize="10" fill="#111111"
                  fontFamily="JetBrains Mono" fontWeight="500">{short}</text>
          </g>
        );
      })}
      <g transform="translate(20, 20)" fontSize="10" fontFamily="Inter">
        <rect x="-4" y="0" width="8" height="8" fill="#CC0000"/>
        <text x="10" y="8" fill="#525252">mutation</text>
        <g transform="translate(0,16)">
          <rect x="-4" y="0" width="8" height="8" fill="#1F4E79"/>
          <text x="10" y="8" fill="#525252">expression</text>
        </g>
        <g transform="translate(0,32)">
          <rect x="-4" y="0" width="8" height="8" fill="#111111"/>
          <text x="10" y="8" fill="#525252">disease</text>
        </g>
        <g transform="translate(0,48)">
          <rect x="-4" y="0" width="8" height="8" fill="#AD6A1A"/>
          <text x="10" y="8" fill="#525252">condition</text>
        </g>
      </g>
    </svg>
  );
}
