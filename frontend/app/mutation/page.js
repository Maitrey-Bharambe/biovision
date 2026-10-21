'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { useBioContext } from '../../components/BioContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

/* Restrained categorical palette: red reserved for the selected or
   top-cardinality series; the rest are muted earth tones.             */
const COLORS = ['#111111', '#1F4E79', '#2E7D32', '#AD6A1A', '#6B3FA0', '#CC0000'];
const TIP  = { background: '#FFFFFF', border: '1px solid #111111', borderRadius: 0, fontSize: 11, color: '#111111', fontFamily: 'JetBrains Mono, monospace' };
const AXIS = { fontSize: 10, stroke: '#525252' };

export default function MutationExplorer() {
  const ctx = useBioContext();
  const [filters, setFilters]   = useState({
    gene: ctx.gene || '',
    chromosome: ctx.chromosome || '',
    mutation_type: '',
  });
  const [rows, setRows]         = useState([]);
  const [byType, setByType]     = useState([]);
  const [byChrom, setByChrom]   = useState([]);
  const [topGenes, setTopGenes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    api.mutationAnalytics().then(v => setByType(v?.by_type || []));
    api.mutationByChrom().then(setByChrom);
    api.mutationTop().then(setTopGenes);
  }, []);

  const applyFilters = (f = filters) => {
    const q = Object.entries(f).filter(([_, v]) => v).map(([k, v]) => `${k}=${v}`).join('&');
    api.mutations(q).then(v => setRows(v || []));
    ctx.setContext({
      gene: f.gene || null,
      chromosome: f.chromosome || null,
    });
  };

  useEffect(() => { applyFilters(filters); /* eslint-disable-line */ }, []);

  const filteredRows = selectedType ? rows.filter(r => r.type === selectedType) : rows;

  return (
    <div>
      <PageHeader
        eyebrow="MUTATIONS"
        title={<>Catalogue of <span className="italic font-normal">change.</span></>}
        description="Filter mutations by gene, chromosome and type. Click a consequence slice or a chromosome bar to cross-filter the table below."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Mutation types"
              subtitle={selectedType ? `Filtering table on: ${selectedType}` : 'Click a slice to cross-filter.'}>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="count" nameKey="type"
                     innerRadius={40} outerRadius={72}
                     onClick={(e) => setSelectedType(st => st === e.type ? null : e.type)}
                     stroke="#111111" strokeWidth={1}>
                  {byType.map((d, i) => (
                    <Cell key={i}
                          fill={selectedType && d.type !== selectedType ? '#F5F5F5' : COLORS[i % COLORS.length]}
                          cursor="pointer"/>
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 10, textTransform:'uppercase', letterSpacing:'0.14em' }} iconType="square" iconSize={8}/>
                <Tooltip contentStyle={TIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {selectedType && (
            <button className="meta !text-[10px] uppercase tracking-[0.2em] mt-1 hover:text-ink"
                    onClick={() => setSelectedType(null)}>
              ↻ Clear selection
            </button>
          )}
        </Card>

        <Card title="Mutations by chromosome"
              subtitle="Click a bar to filter.">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={byChrom}>
                <CartesianGrid strokeDasharray="2 2" stroke="#11111118" vertical={false}/>
                <XAxis dataKey="chromosome" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
                <YAxis {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="mutation_count" fill="#111111"
                     onClick={(e) => applyFilters({ ...filters, chromosome: String(e.chromosome) })}
                     cursor="pointer"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Top mutated genes"
              subtitle="Click a bar to filter.">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={topGenes} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#11111118"/>
                <XAxis type="number" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
                <YAxis type="category" dataKey="gene" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false} width={60}/>
                <Tooltip contentStyle={TIP} />
                <Bar dataKey="mutation_count" fill="#CC0000"
                     onClick={(e) => applyFilters({ ...filters, gene: e.gene })}
                     cursor="pointer"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Filter" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="px-3 py-2 text-sm"
                 placeholder="Gene (e.g. TP53)"
                 value={filters.gene}
                 onChange={(e) => setFilters(f => ({ ...f, gene: e.target.value }))} />
          <input className="px-3 py-2 text-sm"
                 placeholder="Chromosome (e.g. 17)"
                 value={filters.chromosome}
                 onChange={(e) => setFilters(f => ({ ...f, chromosome: e.target.value }))} />
          <select className="px-3 py-2 text-sm"
                  value={filters.mutation_type}
                  onChange={(e) => setFilters(f => ({ ...f, mutation_type: e.target.value }))}>
            <option value="">All types</option>
            <option value="SNP">SNP</option>
            <option value="INS">Insertion</option>
            <option value="DEL">Deletion</option>
            <option value="SUB">Substitution</option>
          </select>
          <button className="btn justify-center" onClick={() => applyFilters(filters)}>Apply</button>
        </div>
      </Card>

      <Card title={`Mutations · ${filteredRows.length}`}>
        <div className="scrollbox">
          <table className="data">
            <thead>
              <tr><th>ID</th><th>Gene</th><th>Chr</th><th>Position</th><th>Ref → Alt</th><th>Type</th><th>Consequence</th><th className="text-right">Freq</th></tr>
            </thead>
            <tbody>
              {filteredRows.slice(0, 200).map((m, i) => (
                <tr key={i}>
                  <td className="font-mono text-xs">{m.mutation_id}</td>
                  <td className="font-sans font-semibold">{m.gene}</td>
                  <td className="num">{m.chromosome}</td>
                  <td className="num">{m.position}</td>
                  <td className="font-mono text-xs">{m.ref} → {m.alt}</td>
                  <td><span className="badge">{m.type}</span></td>
                  <td className="text-prose font-prose">{m.consequence}</td>
                  <td className="num text-right">{m.frequency?.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
