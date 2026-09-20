'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/Card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const AXIS = { fontSize: 11, stroke: '#5b7594' };
const TIP  = { background:'white', border:'1px solid #b8dfe6', borderRadius:12, fontSize:12, color:'#0a2540' };

const DOMAINS = ['Warehouse', 'AlphaGenome', 'Computer Vision'];

export function DomainOlap() {
  const [domain, setDomain] = useState('Warehouse');
  return (
    <>
      <div className="flex gap-2 mb-6 border-b border-border/60 flex-wrap">
        {DOMAINS.map(d => (
          <button key={d}
                  className={`px-4 py-2 text-sm border-b-2 ${
                    domain === d ? 'border-teal text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setDomain(d)}>{d}</button>
        ))}
      </div>
      {domain === 'Warehouse'       && <WarehouseDomain />}
      {domain === 'AlphaGenome'     && <AlphaDomain />}
      {domain === 'Computer Vision' && <CvDomain />}
    </>
  );
}

function WarehouseDomain() {
  const [level, setLevel] = useState('chromosome');
  const [data, setData]   = useState(null);
  const run = async () => setData(await api.olapRollup(level));
  return (
    <>
      <Card title="Roll-up over the warehouse" className="mb-4">
        <div className="flex gap-3 items-center">
          <select value={level} onChange={e=>setLevel(e.target.value)}
                  className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
            <option value="gene">gene</option>
            <option value="chromosome">chromosome</option>
            <option value="genome">genome</option>
          </select>
          <button className="btn" onClick={run}>Run</button>
        </div>
      </Card>
      {data && (
        <Card title={`Level = ${data.level}`}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={(data.rows || []).slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis dataKey="key" {...AXIS}/>
                <YAxis {...AXIS}/>
                <Tooltip contentStyle={TIP}/>
                <Bar dataKey="mutation_count" fill="#0ea5b7" radius={[10,10,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  );
}

function AlphaDomain() {
  const [level, setLevel] = useState('gene');
  const [data, setData]   = useState(null);
  const run = async () => setData(await api.olapAlphaRollup(level));
  return (
    <>
      <Card title="AlphaGenome variant-catalog roll-up" className="mb-4">
        <div className="flex gap-3 items-center">
          <select value={level} onChange={e=>setLevel(e.target.value)}
                  className="bg-white border border-border rounded-xl px-3 py-2 text-sm">
            <option>gene</option><option>chromosome</option>
            <option>consequence</option><option>disease</option><option>mutation_type</option>
          </select>
          <button className="btn" onClick={run}>Run</button>
        </div>
      </Card>
      {data && (
        <Card title={`Variants by ${data.level}`}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.rows.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis dataKey="key" {...AXIS}/>
                <YAxis {...AXIS}/>
                <Tooltip contentStyle={TIP}/>
                <Bar dataKey="variant_count" fill="#a78bfa" radius={[10,10,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  );
}

function CvDomain() {
  const [data, setData] = useState(null);
  useEffect(() => { api.olapCvRollup().then(setData); }, []);
  if (!data) return <Card>Loading…</Card>;
  return (
    <Card title="Computer-Vision test-set summary">
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <Stat k="Accuracy" v={`${(data.test_accuracy*100).toFixed(1)}%`}/>
        <Stat k="Samples"  v={data.n_test}/>
        <Stat k="Epochs"   v={data.epochs}/>
      </div>
      <table className="data">
        <thead><tr><th>Class</th><th>Support</th><th>Recall</th><th>Precision</th></tr></thead>
        <tbody>
          {data.per_class.map((r, i) => (
            <tr key={i}>
              <td className="font-semibold">{r.class_}</td>
              <td>{r.support}</td>
              <td className="tabular-nums text-teal">{r.accuracy}</td>
              <td className="tabular-nums">{r.precision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
function Stat({ k, v }) {
  return (
    <div className="card !py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted">{k}</div>
      <div className="text-2xl font-display font-bold text-ink">{v}</div>
    </div>
  );
}
