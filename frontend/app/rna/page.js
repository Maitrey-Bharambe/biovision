'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const TIP = { background: '#FFFFFF', border: '1px solid #111111', borderRadius: 0, fontSize: 11, color: '#111111', fontFamily: 'JetBrains Mono, monospace' };
const AXIS = { fontSize: 10, stroke: '#525252' };

/* A monochrome-ink heatmap, newspaper style. */
function Heatmap({ data }) {
  if (!data || !data.length) return <div className="meta">Loading heatmap…</div>;
  const genes    = [...new Set(data.map(d => d.gene))].slice(0, 18);
  const tissues  = [...new Set(data.map(d => d.tissue))];
  const map      = new Map(data.map(d => [`${d.gene}|${d.tissue}`, d.value]));
  const max      = Math.max(...data.map(d => d.value || 0));

  const color = (v) => {
    if (!v) return '#F5F5F5';
    const t = Math.min(1, v / (max || 1));
    // Interpolate paper → ink with a touch of red at the top end.
    const r = Math.round(249 - t * (249 - 204));
    const g = Math.round(249 - t * (249 -  0));
    const b = Math.round(247 - t * (247 -  0));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="overflow-auto border border-ink">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-subtle border-b-2 border-ink">
            <th className="p-2 text-left eyebrow !text-[9px] text-ink">Gene</th>
            {tissues.map(t => (
              <th key={t} className="p-2 eyebrow !text-[9px] text-ink">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {genes.map((g, gi) => (
            <tr key={g} className={gi%2 ? 'bg-subtle' : ''}>
              <td className="p-1 font-sans font-semibold text-ink border-r border-ink">{g}</td>
              {tissues.map(t => {
                const v = map.get(`${g}|${t}`);
                return (
                  <td key={t} className="p-0 border-r border-ink last:border-r-0">
                    <div className="w-full h-7"
                         title={`${g} · ${t} · ${v?.toFixed?.(2) ?? '—'}`}
                         style={{ background: color(v) }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 p-2 border-t border-ink bg-white">
        <span className="meta !text-[9px]">0</span>
        <div className="flex-1 h-2" style={{ background: 'linear-gradient(90deg, #F9F9F7 0%, #AD6A1A 60%, #CC0000 100%)', border:'1px solid #111'}}/>
        <span className="meta !text-[9px]">max TPM</span>
      </div>
    </div>
  );
}

export default function RnaExplorer() {
  const [top, setTop] = useState({ up: [], down: [] });
  const [hm, setHm] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.rnaTop('up', 15).then(v => setTop(t => ({ ...t, up: v || [] })));
    api.rnaTop('down', 15).then(v => setTop(t => ({ ...t, down: v || [] })));
    api.rnaHeatmap().then(v => setHm(v || []));
    api.rna('limit=100').then(v => setRows(v || []));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="TRANSCRIPTOMICS"
        title={<>Expression, <span className="italic font-normal">by tissue.</span></>}
        description="Gene expression across tissues and conditions. High-expression genes are potential biomarkers; low-expression genes may indicate silencing."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Top upregulated genes" subtitle="highest mean TPM across all RNA samples">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top.up} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#11111118"/>
                <XAxis type="number" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
                <YAxis type="category" dataKey="gene" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false} width={60} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="mean_expression" fill="#2E7D32"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top downregulated genes" subtitle="lowest mean TPM">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top.down} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#11111118"/>
                <XAxis type="number" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
                <YAxis type="category" dataKey="gene" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false} width={60} />
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="mean_expression" fill="#CC0000"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Expression heatmap" subtitle="mean expression per gene × tissue" className="mb-6">
        <Heatmap data={hm} />
      </Card>

      <Card title="RNA samples · first 100">
        <div className="scrollbox">
          <table className="data">
            <thead>
              <tr><th>Sample</th><th>Gene</th><th>Tissue</th><th>Condition</th><th className="text-right">TPM</th><th>Category</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{r.rna_sample_id}</td>
                  <td className="font-sans font-semibold">{r.gene}</td>
                  <td>{r.tissue}</td>
                  <td className={r.condition === 'diseased' ? 'text-accent' : 'text-ink'}>{r.condition}</td>
                  <td className="num text-right">{r.tpm?.toFixed(2)}</td>
                  <td><span className="badge">{r.category}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
