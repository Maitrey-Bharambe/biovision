'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const COLORS = ['#38bdf8', '#22d3ee', '#34d399', '#f59e0b', '#f87171', '#a78bfa'];

export default function MutationExplorer() {
  const [filters, setFilters]   = useState({ gene: '', chromosome: '', mutation_type: '' });
  const [rows, setRows]         = useState([]);
  const [byType, setByType]     = useState([]);
  const [byChrom, setByChrom]   = useState([]);
  const [topGenes, setTopGenes] = useState([]);

  useEffect(() => {
    api.mutationAnalytics().then(v => setByType(v?.by_type || []));
    api.mutationByChrom().then(setByChrom);
    api.mutationTop().then(setTopGenes);
  }, []);

  const applyFilters = () => {
    const q = Object.entries(filters).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`).join('&');
    api.mutations(q).then(v => setRows(v || []));
  };

  useEffect(() => { applyFilters(); }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Mutation Explorer"
        description="Filter mutations by gene, chromosome and type. Ties each mutation back to its gene and the samples it appears in."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Mutation types">
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="count" nameKey="type" innerRadius={40} outerRadius={70}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1f2a44', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Mutations by chromosome">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byChrom}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                <XAxis dataKey="chromosome" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1f2a44', fontSize: 12 }} />
                <Bar dataKey="mutation_count" fill="#f59e0b" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top mutated genes">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={topGenes} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="gene" stroke="#94a3b8" fontSize={11} width={60} />
                <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1f2a44', fontSize: 12 }} />
                <Bar dataKey="mutation_count" fill="#f87171" radius={[0,6,6,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Filter" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="bg-panel2 border border-border rounded px-3 py-2 text-sm"
                 placeholder="Gene (e.g. TP53)"
                 value={filters.gene}
                 onChange={(e) => setFilters(f => ({ ...f, gene: e.target.value }))} />
          <input className="bg-panel2 border border-border rounded px-3 py-2 text-sm"
                 placeholder="Chromosome (e.g. 17)"
                 value={filters.chromosome}
                 onChange={(e) => setFilters(f => ({ ...f, chromosome: e.target.value }))} />
          <select className="bg-panel2 border border-border rounded px-3 py-2 text-sm"
                  value={filters.mutation_type}
                  onChange={(e) => setFilters(f => ({ ...f, mutation_type: e.target.value }))}>
            <option value="">All types</option>
            <option value="SNP">SNP</option>
            <option value="INS">Insertion</option>
            <option value="DEL">Deletion</option>
            <option value="SUB">Substitution</option>
          </select>
          <button className="btn justify-center" onClick={applyFilters}>Apply</button>
        </div>
      </Card>

      <Card title={`Mutations (${rows.length})`}>
        <div className="scrollbox">
          <table className="data">
            <thead>
              <tr><th>ID</th><th>Gene</th><th>Chr</th><th>Position</th><th>Ref → Alt</th><th>Type</th><th>Consequence</th><th>Freq</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((m, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{m.mutation_id}</td>
                  <td className="font-medium">{m.gene}</td>
                  <td>{m.chromosome}</td>
                  <td className="tabular-nums">{m.position}</td>
                  <td className="font-mono text-xs">{m.ref} → {m.alt}</td>
                  <td><span className="badge">{m.type}</span></td>
                  <td className="text-muted">{m.consequence}</td>
                  <td className="tabular-nums">{m.frequency?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
