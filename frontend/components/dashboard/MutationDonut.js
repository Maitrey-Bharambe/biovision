'use client';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLOR = { SNP:'#2f6df1', INS:'#4dd0e1', DEL:'#e0a021', SUB:'#a78bfa' };

export function MutationDonut({ data = [], total }) {
  // data = [{ type, count }]
  const totalCount = total ?? data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      <div className="relative">
        <div className="h-52">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="type"
                   innerRadius={58} outerRadius={90} paddingAngle={3}>
                {data.map((d, i) => (
                  <Cell key={i} fill={COLOR[d.type] || '#0ea5b7'} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-display font-bold text-ink">{totalCount}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted">Total</div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => {
          const pct = totalCount ? Math.round(d.count / totalCount * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR[d.type] || '#0ea5b7' }} />
              <span className="text-ink2 flex-1">
                {({ SNP:'SNP', INS:'Insertion', DEL:'Deletion', SUB:'Substitution' })[d.type] || d.type}
              </span>
              <span className="text-ink font-semibold tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
