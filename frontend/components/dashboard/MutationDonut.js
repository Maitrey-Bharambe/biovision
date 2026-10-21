'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLOR = { SNP:'#111111', INS:'#1F4E79', DEL:'#AD6A1A', SUB:'#6B3FA0' };
const LABELS = { SNP:'SNP', INS:'Insertion', DEL:'Deletion', SUB:'Substitution' };

export function MutationDonut({ data = [], total }) {
  const totalCount = total ?? data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      <div className="relative">
        <div className="h-52">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="type"
                   innerRadius={56} outerRadius={88}
                   stroke="#111111" strokeWidth={1}>
                {data.map((d, i) => (
                  <Cell key={i} fill={COLOR[d.type] || '#CC0000'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-display font-bold text-ink metric-value">{totalCount}</div>
          <div className="meta !text-[9px]">Total</div>
        </div>
      </div>
      <div className="space-y-1">
        {data.map((d, i) => {
          const pct = totalCount ? Math.round(d.count / totalCount * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-2 text-sm font-prose border-b border-ink/20 pb-1 last:border-b-0">
              <span className="w-3 h-3 border border-ink" style={{ background: COLOR[d.type] || '#CC0000' }} />
              <span className="text-ink flex-1">{LABELS[d.type] || d.type}</span>
              <span className="font-mono text-ink font-semibold tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
