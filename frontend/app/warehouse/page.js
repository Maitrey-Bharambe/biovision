'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

export default function WarehousePage() {
  const [schema, setSchema] = useState(null);
  const [etlReport, setEtlReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { api.warehouseSchema().then(setSchema); }, []);

  const runEtl = async () => {
    setBusy(true);
    setEtlReport(await api.runEtl());
    setBusy(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="WAREHOUSE"
        title={<>Star schema, <span className="italic font-normal">in black.</span></>}
        description="A central fact table with 11 conformed dimensions. DIM_CHROMOSOME snowflakes off DIM_GENOME; DIM_GENE snowflakes off DIM_CHROMOSOME. Click a dimension to inspect it."
        right={<button className="btn" disabled={busy} onClick={runEtl}>{busy ? 'Running ETL…' : 'Run ETL'}</button>}
      />

      {etlReport && (
        <Card title="ETL report" className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-0 border border-ink -mx-5 md:-mx-6 -mb-4">
            <Stat label="Extracted"   v={etlReport.extracted} />
            <Stat label="Cleaned"     v={etlReport.cleaned}   tone="good" />
            <Stat label="Duplicates"  v={etlReport.duplicates_removed} tone="warn" />
            <Stat label="Loaded"      v={etlReport.loaded}    tone="accent" />
            <Stat label="Errors"      v={etlReport.errors}    tone="bad" />
            <Stat label="Elapsed"     v={`${etlReport.elapsed_seconds}s`} />
          </div>
        </Card>
      )}

      <Card title="Schema map" subtitle="dimensions radiate around the fact. Click a node." className="mb-6">
        <SchemaSvg schema={schema} selected={selected} onSelect={setSelected}/>
      </Card>

      {schema && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="FACT" className="md:col-span-1"
                subtitle={schema.fact.name}>
            <ul className="text-xs space-y-1 font-mono">
              {schema.fact.columns.map(c => (
                <li key={c}>
                  {c.endsWith('_key') ? <span className="text-accent font-semibold">{c}</span> : c}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={selected ? `Inspector · ${selected}` : 'Dimensions'}
                className="md:col-span-2"
                subtitle={selected ? 'Click a row to compare.' : 'Click any dimension to inspect its grain.'}>
            {selected ? (
              <DimDetail name={selected} schema={schema} onClose={() => setSelected(null)}/>
            ) : (
              <table className="data">
                <thead><tr><th>Name</th><th>Grain</th></tr></thead>
                <tbody>
                  {schema.dimensions.map(d => (
                    <tr key={d.name} onClick={() => setSelected(d.name)} className="cursor-pointer">
                      <td className="font-mono text-accent font-semibold">{d.name}</td>
                      <td className="text-prose font-prose">{d.grain}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Snowflake edges">
            <ul className="text-sm space-y-1">
              {schema.snowflake_edges.map((e, i) => (
                <li key={i} className="font-mono">
                  <span>{e.from}</span>
                  <span className="mx-2 text-accent">→</span>
                  <span className="text-accent font-semibold">{e.to}</span>
                </li>
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
    </div>
  );
}

function Stat({ label, v, tone='default' }) {
  const c = {
    default: 'text-ink',
    good:    'text-[#2E7D32]',
    warn:    'text-[#AD6A1A]',
    bad:     'text-accent',
    accent:  'text-accent',
  }[tone];
  return (
    <div className="p-3 border-r border-b border-ink last:border-r-0">
      <div className="eyebrow text-meta !text-[9px]">{label}</div>
      <div className={`text-xl metric-value mt-1 ${c}`}>{v ?? '—'}</div>
    </div>
  );
}

function DimDetail({ name, schema, onClose }) {
  const d = schema.dimensions.find(x => x.name === name);
  if (!d) return <div className="meta">Not found.</div>;
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="eyebrow !text-[10px] text-meta">Grain</div>
          <div className="font-prose text-ink">{d.grain}</div>
        </div>
        <button className="meta !text-[10px] uppercase tracking-[0.18em] hover:text-ink"
                onClick={onClose}>↩ Back</button>
      </div>
      {d.columns && (
        <div>
          <div className="eyebrow !text-[10px] text-meta mb-2">Columns</div>
          <ul className="text-xs font-mono grid grid-cols-2 gap-y-1">
            {d.columns.map(c => (
              <li key={c}>{c.endsWith('_key') ? <span className="text-accent font-semibold">{c}</span> : c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SchemaSvg({ schema, selected, onSelect }) {
  const dims = schema?.dimensions?.map(d => d.name) || [
    'DIM_SAMPLE','DIM_GENE','DIM_GENOME','DIM_CHROMOSOME','DIM_RNA',
    'DIM_PROTEIN','DIM_MUTATION','DIM_DISEASE','DIM_IMAGE','DIM_ORGANISM','DIM_TIME',
  ];
  const cx = 450, cy = 250, R = 190;
  return (
    <div className="w-full overflow-x-auto bg-subtle border border-ink">
      <svg viewBox="0 0 900 500" className="w-full h-auto">
        {dims.map((d, i) => {
          const a = (i / dims.length) * 2 * Math.PI - Math.PI/2;
          const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          const sel = selected === d;
          return (
            <g key={d} onClick={() => onSelect(d)} style={{ cursor: 'pointer' }}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#111111"/>
              <rect x={x-45} y={y-16} width="90" height="32"
                    fill={sel ? '#CC0000' : '#FFFFFF'} stroke="#111111" strokeWidth="1.2"/>
              <text x={x} y={y+4} textAnchor="middle" fontSize="10"
                    fontFamily="JetBrains Mono" fill={sel ? '#FFFFFF' : '#111111'} fontWeight="700">
                {d.replace('DIM_','')}
              </text>
            </g>
          );
        })}
        <rect x={cx-70} y={cy-30} width="140" height="60" fill="#111111" stroke="#111111"/>
        <text x={cx} y={cy-8} textAnchor="middle" fontSize="12" fill="#CC0000" fontFamily="Inter" fontWeight="700" letterSpacing="2">
          FACT
        </text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="9" fill="#F9F9F7" fontFamily="JetBrains Mono">
          BIOLOGICAL_OBSERVATION
        </text>
      </svg>
    </div>
  );
}
