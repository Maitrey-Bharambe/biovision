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
        eyebrow="PROTEOMICS"
        title={<>Where the chain <span className="italic font-normal">resolves.</span></>}
        description="Every protein links back to its gene. The DNA → RNA → Protein chain is preserved throughout the warehouse."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="Select protein" className="md:col-span-1">
          <select className="w-full px-3 py-2 text-sm"
                  value={selected || ''} onChange={(e) => setSelected(e.target.value)}>
            {proteins.map(p => (
              <option key={p.protein_id} value={p.protein_id}>
                {p.protein_name} · {p.gene}
              </option>
            ))}
          </select>
          {detail && (
            <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-sm font-prose">
              <Row k="Protein"   v={detail.protein_name}/>
              <Row k="Gene"      v={<span className="text-accent font-sans font-semibold">{detail.gene}</span>}/>
              <Row k="Length"    v={<span className="font-mono">{detail.length} aa</span>}/>
              <Row k="MW"        v={<span className="font-mono">{detail.molecular_weight?.toFixed(0)} Da</span>}/>
              <Row k="Abundance" v={<span className="font-mono text-accent">{detail.abundance?.toFixed(2)}</span>}/>
              <Row k="Location"  v={detail.cellular_location}/>
              <Row k="EC"        v={<span className="font-mono">{detail.ec_number}</span>}/>
              <dd className="col-span-2 mt-2 text-xs text-prose font-prose leading-relaxed border-t border-ink pt-2">
                {detail.function}
              </dd>
            </dl>
          )}
        </Card>

        <Card title="Amino-acid sequence sample" className="md:col-span-2">
          <div className="scrollbox">
            <div className="dna text-xs leading-6 text-ink bg-subtle p-2 border border-ink">
              {detail?.amino_acid_sequence
                ? detail.amino_acid_sequence.match(/.{1,60}/g).map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-meta w-10 text-right tabular-nums">{i*60+1}</span>
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
              <CartesianGrid strokeDasharray="2 2" stroke="#11111118"/>
              <XAxis type="number" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false}/>
              <YAxis type="category" dataKey="protein_name" {...AXIS} axisLine={{ stroke:'#111' }} tickLine={false} width={140}/>
              <Tooltip contentStyle={TIP} />
              <Bar dataKey="abundance" fill="#1F4E79"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <>
      <dt className="eyebrow !text-[10px] text-meta pt-0.5">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </>
  );
}
