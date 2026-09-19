'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function Heatmap({ data }) {
  if (!data || !data.length) return <div className="text-muted text-sm">Loading heatmap…</div>;
  const genes    = [...new Set(data.map(d => d.gene))].slice(0, 18);
  const tissues  = [...new Set(data.map(d => d.tissue))];
  const map      = new Map(data.map(d => [`${d.gene}|${d.tissue}`, d.value]));
  const max      = Math.max(...data.map(d => d.value || 0));

  const color = (v) => {
    if (!v) return '#0b1120';
    const t = Math.min(1, v / (max || 1));
    const r = Math.round(56 + t * 200);
    const g = Math.round(189 - t * 100);
    const b = Math.round(248 - t * 100);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="overflow-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-left text-muted">Gene</th>
            {tissues.map(t => <th key={t} className="p-1 text-muted text-[10px]">{t}</th>)}
          </tr>
        </thead>
        <tbody>
          {genes.map(g => (
            <tr key={g}>
              <td className="p-1 font-medium">{g}</td>
              {tissues.map(t => {
                const v = map.get(`${g}|${t}`);
                return (
                  <td key={t} className="p-0">
                    <div className="w-9 h-6 rounded-sm m-0.5" title={`${g} · ${t} · ${v?.toFixed?.(2) ?? '—'}`}
                         style={{ background: color(v) }} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
        eyebrow="Explore"
        title="RNA Explorer"
        description="Gene expression across tissues and conditions. High-expression genes are potential biomarkers; low-expression genes may indicate silencing."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Top upregulated genes" subtitle="highest mean TPM across all RNA samples">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top.up} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="gene" stroke="#94a3b8" fontSize={11} width={60} />
                <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1f2a44', fontSize: 12 }} />
                <Bar dataKey="mean_expression" fill="#34d399" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top downregulated genes" subtitle="lowest mean TPM">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top.down} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="gene" stroke="#94a3b8" fontSize={11} width={60} />
                <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1f2a44', fontSize: 12 }} />
                <Bar dataKey="mean_expression" fill="#f87171" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Expression heatmap" subtitle="mean expression per gene × tissue" className="mb-6">
        <Heatmap data={hm} />
      </Card>

      <Card title="RNA samples (first 100)">
        <div className="scrollbox">
          <table className="data">
            <thead>
              <tr><th>Sample</th><th>Gene</th><th>Tissue</th><th>Condition</th><th>TPM</th><th>Category</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{r.rna_sample_id}</td>
                  <td className="font-medium">{r.gene}</td>
                  <td>{r.tissue}</td>
                  <td className={r.condition === 'diseased' ? 'text-warn' : 'text-good'}>{r.condition}</td>
                  <td className="tabular-nums text-accent">{r.tpm?.toFixed(2)}</td>
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
