'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

export default function WarehousePage() {
  const [schema, setSchema] = useState(null);
  const [etlReport, setEtlReport] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.warehouseSchema().then(setSchema); }, []);

  const runEtl = async () => {
    setBusy(true);
    setEtlReport(await api.runEtl());
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Warehouse"
        title="Data Warehouse — Star Schema"
        description="Central fact table with 11 conformed dimensions. DIM_CHROMOSOME snowflakes off DIM_GENOME; DIM_GENE snowflakes off DIM_CHROMOSOME."
        right={<button className="btn" disabled={busy} onClick={runEtl}>{busy ? 'Running ETL…' : 'Run ETL'}</button>}
      />

      {etlReport && (
        <Card title="ETL report" className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <Stat label="Extracted"   v={etlReport.extracted} />
            <Stat label="Cleaned"     v={etlReport.cleaned}   tone="good" />
            <Stat label="Duplicates"  v={etlReport.duplicates_removed} tone="warn" />
            <Stat label="Loaded"      v={etlReport.loaded}    tone="accent" />
            <Stat label="Errors"      v={etlReport.errors}    tone="bad" />
            <Stat label="Elapsed"     v={`${etlReport.elapsed_seconds}s`} />
          </div>
        </Card>
      )}

      {schema && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="FACT" className="md:col-span-1" subtitle={schema.fact.name}>
            <ul className="text-xs space-y-1">
              {schema.fact.columns.map(c => (
                <li key={c} className="font-mono">
                  {c.endsWith('_key') ? <span className="text-accent">{c}</span> : c}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Dimensions" className="md:col-span-2">
            <table className="data">
              <thead><tr><th>Name</th><th>Grain</th></tr></thead>
              <tbody>
                {schema.dimensions.map(d => (
                  <tr key={d.name}>
                    <td className="font-mono text-accent">{d.name}</td>
                    <td className="text-muted">{d.grain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Snowflake edges">
            <ul className="text-sm space-y-1">
              {schema.snowflake_edges.map((e, i) => (
                <li key={i}><span className="font-mono">{e.from}</span> → <span className="font-mono text-accent">{e.to}</span></li>
              ))}
            </ul>
          </Card>

          <Card title="Measures" className="md:col-span-2">
            <div className="flex flex-wrap gap-2">
              {schema.measures.map(m => <span key={m} className="badge">{m}</span>)}
            </div>
          </Card>
        </div>
      )}

      <Card title="Schema map" subtitle="dim tables radiating around the fact" className="mt-6">
        <SchemaSvg />
      </Card>
    </div>
  );
}

function Stat({ label, v, tone='default' }) {
  const c = { default: 'text-text', good: 'text-good', warn: 'text-warn', bad: 'text-bad', accent: 'text-accent' }[tone];
  return (
    <div className="card !p-3">
      <div className="card-heading">{label}</div>
      <div className={`text-lg metric-value mt-1 ${c}`}>{v ?? '—'}</div>
    </div>
  );
}

function SchemaSvg() {
  const dims = [
    'DIM_SAMPLE','DIM_GENE','DIM_GENOME','DIM_CHROMOSOME','DIM_RNA',
    'DIM_PROTEIN','DIM_MUTATION','DIM_DISEASE','DIM_IMAGE','DIM_ORGANISM','DIM_TIME',
  ];
  const cx = 450, cy = 250, R = 190;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox="0 0 900 500" className="w-full h-auto">
        <defs>
          <radialGradient id="factG" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0b1120" />
          </radialGradient>
        </defs>
        {dims.map((d, i) => {
          const a = (i / dims.length) * 2 * Math.PI - Math.PI/2;
          const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          return (
            <g key={d}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#38bdf8" strokeOpacity="0.35" />
              <circle cx={x} cy={y} r="34" fill="#0b1120" stroke="#38bdf8" />
              <text x={x} y={y+3} textAnchor="middle" fontSize="9" fill="#e6edf7">{d.replace('DIM_','')}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="70" fill="url(#factG)" stroke="#22d3ee" strokeWidth="2" />
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="11" fill="#22d3ee">FACT</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="9" fill="#e6edf7">BIOLOGICAL_OBSERVATION</text>
      </svg>
    </div>
  );
}
