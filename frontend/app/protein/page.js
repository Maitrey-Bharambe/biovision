'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

export default function ProteinExplorer() {
  const [proteins, setProteins] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]     = useState(null);

  useEffect(() => {
    api.proteins().then(v => {
      setProteins(v || []);
      if (v && v.length) setSelected(v[0].protein_id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.protein(selected).then(setDetail);
  }, [selected]);

  const top = [...proteins].sort((a, b) => (b.abundance || 0) - (a.abundance || 0)).slice(0, 12);

  return (
    <div>
      <PageHeader
        eyebrow="Explore"
        title="Protein Explorer"
        description="Every protein links back to its gene. The DNA → RNA → Protein chain is preserved throughout the warehouse."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Select protein" className="md:col-span-1">
          <select className="w-full bg-panel2 border border-border rounded px-3 py-2 text-sm"
                  value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
            {proteins.map(p => (
              <option key={p.protein_id} value={p.protein_id}>
                {p.protein_name} · {p.gene}
              </option>
            ))}
          </select>
          {detail && (
            <div className="mt-4 space-y-2 text-sm">
              <div><span className="text-muted">Protein:</span> {detail.protein_name}</div>
              <div><span className="text-muted">Gene:</span> <span className="text-accent">{detail.gene}</span></div>
              <div><span className="text-muted">Length:</span> {detail.length} aa</div>
              <div><span className="text-muted">MW:</span> {detail.molecular_weight?.toFixed(0)} Da</div>
              <div><span className="text-muted">Abundance:</span> <span className="text-accent">{detail.abundance?.toFixed(2)}</span></div>
              <div><span className="text-muted">Location:</span> {detail.cellular_location}</div>
              <div><span className="text-muted">EC:</span> {detail.ec_number}</div>
              <div className="mt-2 text-xs text-text/80 leading-relaxed">{detail.function}</div>
            </div>
          )}
        </Card>

        <Card title="Amino-acid sequence sample" className="md:col-span-2">
          <div className="scrollbox">
            <div className="dna text-xs leading-6 text-text/80">
              {detail?.amino_acid_sequence
                ? detail.amino_acid_sequence.match(/.{1,60}/g).map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-muted w-10 text-right tabular-nums">{i*60+1}</span>
                      <span>{row}</span>
                    </div>
                  ))
                : 'Loading…'}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Top proteins by abundance" subtitle="dataset abundance signal">
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={top} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} />
              <YAxis type="category" dataKey="protein_name" stroke="#94a3b8" fontSize={10} width={140} />
              <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1f2a44', fontSize: 12 }} />
              <Bar dataKey="abundance" fill="#22d3ee" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
