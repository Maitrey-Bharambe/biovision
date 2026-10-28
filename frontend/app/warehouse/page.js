'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

export default function WarehouseHealthPage() {
  const [health, setHealth]   = useState(null);
  const [schema, setSchema]   = useState(null);
  const [etl, setEtl]         = useState(null);
  const [etlBusy, setEtlBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [status, setStatus]   = useState('loading');

  useEffect(() => {
    (async () => {
      const [h, s] = await Promise.all([
        api.nexusInvestigate({
          question: 'Check warehouse health and connectivity.',
          explain: false,
        }),
        api.warehouseSchema(),
      ]);
      setHealth(h?.results?.[0]?.output || null);
      setSchema(s || null);
      setStatus('ok');
    })();
  }, []);

  const runEtl = async () => {
    setEtlBusy(true);
    setEtl(await api.runEtl());
    setEtlBusy(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="WAREHOUSE HEALTH"
        title="A pulse on the fact table."
        description="Database connectivity, table availability and record counts for the current snapshot. Backed by read-only diagnostic queries."
        right={<button className="btn" disabled={etlBusy} onClick={runEtl}>{etlBusy ? 'Running ETL…' : 'Run ETL'}</button>}
      />

      {/* === Health ================================ */}
      <div className="grid grid-cols-12 gap-4 mb-6">
        <Card className="col-span-12 lg:col-span-5" title="Connectivity">
          {health === null && <div className="meta !normal-case !tracking-normal">Checking…</div>}
          {health && (
            <>
              <div className="flex items-center gap-2 mb-2 text-[14px]">
                <span className={`w-2 h-2 rounded-full ${health.connected ? 'bg-good' : 'bg-bad'}`}/>
                {health.connected ? 'Database reachable' : 'Database unreachable'}
              </div>
              {(health.errors || []).map((e, i) => (
                <div key={i} className="text-[12px] text-bad">{e}</div>
              ))}
              <div className="meta mt-3 !normal-case !tracking-normal">
                {(health.tables || []).length} table(s) discovered.
                Row counts come from <span className="font-mono text-ink">SELECT COUNT(*)</span>, not stubs.
              </div>
            </>
          )}
        </Card>

        <Card className="col-span-12 lg:col-span-7" title="Table inventory">
          {health?.tables ? (
            <table className="data">
              <thead><tr><th>Table</th><th className="text-right">Rows</th><th>Error</th></tr></thead>
              <tbody>
                {health.tables.map((t) => (
                  <tr key={t.name}>
                    <td className="font-mono text-[12.5px]">{t.name}</td>
                    <td className="num text-right">{t.rows ?? '—'}</td>
                    <td className="text-[11.5px] text-bad">{t.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="meta !normal-case !tracking-normal">—</div>}
        </Card>
      </div>

      {/* === ETL report ===================================================================================== */}
      {etl && (
        <Card title="ETL report" className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatBit label="Extracted"  v={etl.extracted}/>
            <StatBit label="Cleaned"    v={etl.cleaned} tone="good"/>
            <StatBit label="Duplicates" v={etl.duplicates_removed} tone="warn"/>
            <StatBit label="Loaded"     v={etl.loaded} tone="accent"/>
            <StatBit label="Errors"     v={etl.errors} tone="bad"/>
            <StatBit label="Elapsed"    v={`${etl.elapsed_seconds}s`}/>
          </div>
        </Card>
      )}

      {/* === Schema map + inspector =============== */}
      {schema && (
        <>
          <h2 className="font-display font-semibold text-xl text-ink mb-3">Dimensional model</h2>
          <div className="grid grid-cols-12 gap-4">
            <Card className="col-span-12 lg:col-span-7" title="Star schema"
                  subtitle="Click a dimension to inspect its grain.">
              <SchemaSvg schema={schema} selected={selected} onSelect={setSelected}/>
            </Card>

            <div className="col-span-12 lg:col-span-5 space-y-4">
              <Card title={selected ? `Inspector · ${selected}` : 'Fact table'}>
                {selected ? (
                  <DimDetail name={selected} schema={schema} onClose={() => setSelected(null)}/>
                ) : (
                  <div>
                    <div className="font-sans font-semibold text-[14px]">{schema.fact.name}</div>
                    <ul className="text-xs mt-3 space-y-1 font-mono">
                      {schema.fact.columns.map(c => (
                        <li key={c}>
                          {c.endsWith('_key')
                            ? <span className="text-accent font-semibold">{c}</span>
                            : <span>{c}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              <Card title="Snowflake edges">
                <ul className="text-[13px] space-y-1">
                  {schema.snowflake_edges.map((e, i) => (
                    <li key={i} className="font-mono">
                      <span>{e.from}</span>
                      <span className="mx-2 text-accent">→</span>
                      <span className="text-accent font-semibold">{e.to}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Measures">
                <div className="flex flex-wrap gap-2">
                  {schema.measures.map(m => <span key={m} className="badge">{m}</span>)}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBit({ label, v, tone='default' }) {
  const c = {
    default: 'text-ink',
    good:    'text-good',
    warn:    'text-warn',
    bad:     'text-bad',
    accent:  'text-accent',
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="meta !text-[9.5px]">{label}</div>
      <div className={`metric-value text-2xl mt-1 ${c}`}>{v ?? '—'}</div>
    </div>
  );
}

function DimDetail({ name, schema, onClose }) {
  const d = schema.dimensions.find(x => x.name === name);
  if (!d) return <div className="text-muted text-[13px]">Not found.</div>;
  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="meta !text-[10px]">Grain</div>
          <div className="text-[14px] text-ink">{d.grain}</div>
        </div>
        <button onClick={onClose}
                className="meta !text-[10px] hover:text-ink underline-offset-4 hover:underline">↩ Back</button>
      </div>
      {d.columns && (
        <div>
          <div className="meta !text-[10px] mb-2">Columns</div>
          <ul className="text-xs font-mono grid grid-cols-2 gap-y-1">
            {d.columns.map(c => (
              <li key={c}>
                {c.endsWith('_key')
                  ? <span className="text-accent font-semibold">{c}</span>
                  : <span>{c}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SchemaSvg({ schema, selected, onSelect }) {
  const dims = schema?.dimensions?.map(d => d.name) || [];
  const cx = 450, cy = 240, R = 170;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox="0 0 900 480" className="w-full h-auto">
        {dims.map((d, i) => {
          const a = (i / dims.length) * 2 * Math.PI - Math.PI/2;
          const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
          const sel = selected === d;
          return (
            <g key={d} onClick={() => onSelect(d)} style={{ cursor: 'pointer' }}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="#DED9CD" strokeWidth="1"/>
              <rect x={x-55} y={y-18} width="110" height="36" rx="8"
                    fill={sel ? '#7656E8' : '#FFFEFA'}
                    stroke={sel ? '#5E3FD6' : '#DED9CD'} strokeWidth="1"/>
              <text x={x} y={y+5} textAnchor="middle" fontSize="11"
                    fontFamily="JetBrains Mono"
                    fill={sel ? '#FFFEFA' : '#171717'} fontWeight="600">
                {d.replace('DIM_','')}
              </text>
            </g>
          );
        })}
        <rect x={cx-80} y={cy-30} width="160" height="60" rx="12"
              fill="#171717" stroke="#171717"/>
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="12"
              fill="#F0B4D5" fontFamily="Inter" fontWeight="700" letterSpacing="2">
          FACT
        </text>
        <text x={cx} y={cy+14} textAnchor="middle" fontSize="9.5"
              fill="#F8F5EC" fontFamily="JetBrains Mono">
          BIOLOGICAL_OBSERVATION
        </text>
      </svg>
    </div>
  );
}
