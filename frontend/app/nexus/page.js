'use client';
import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { useBioContext } from '../../components/BioContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

const EXAMPLES = [
  'Show the distribution of mutation types in the current dataset.',
  'Compare TP53 expression across tissues for healthy vs cancer samples.',
  'List the data sources behind the warehouse.',
  'What mutations are catalogued for BRCA1?',
  'Look up EGFR — give me its gene card.',
  'Check warehouse health and connectivity.',
];

const CATS = ['#7656E8','#F0B4D5','#F4D96B','#A9C59A','#AFC8F0','#C14D5A'];

export default function NexusPage() {
  return (
    <Suspense fallback={<div className="meta !normal-case !tracking-normal">Loading…</div>}>
      <NexusInner/>
    </Suspense>
  );
}

function NexusInner() {
  const sp = useSearchParams();
  const initialQ = sp.get('q') || '';
  const ctx = useBioContext();

  const [q, setQ] = useState(initialQ);
  const [session, setSession] = useState([]);     // list of past investigations in this tab
  const [current, setCurrent] = useState(null);   // currently selected result
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState(null); // { groq_available, note, model }

  useEffect(() => { api.nexusStatus().then(setProvider); }, []);
  useEffect(() => { if (initialQ) run(initialQ); /* eslint-disable-line */ }, []);

  const run = async (question) => {
    if (!question?.trim()) return;
    setBusy(true);
    const t0 = performance.now();
    const res = await api.nexusInvestigate({ question: question.trim() });
    const t1 = performance.now();
    if (!res) {
      setBusy(false);
      setCurrent({ question, error: 'Backend unavailable.', ts: Date.now() });
      return;
    }
    const entry = { ...res, ts: Date.now(), round_trip_ms: Math.round(t1 - t0) };
    setCurrent(entry);
    setSession((s) => [entry, ...s].slice(0, 20));
    // Lightly promote any gene mentioned in the plan into shared context.
    const geneParam = res?.plan?.steps
      ?.flatMap((st) => Object.entries(st.params || {}))
      ?.find(([k]) => k === 'gene')?.[1];
    if (geneParam) ctx.setContext({ gene: geneParam });
    setBusy(false);
  };

  const submit = (e) => { e?.preventDefault?.(); run(q); };

  return (
    <div>
      <PageHeader
        eyebrow="Nexus"
        description="Describe what you want to find out. BioVision plans an answer using the warehouse and the trained models, keeps every number traceable, and asks a language model only to explain — never to invent."
      />

      {/* Provider status */}
      {provider && (
        <div className="flex items-center gap-2 mb-5 text-[12px]">
          <span className={`w-1.5 h-1.5 rounded-full ${provider.groq_available ? 'bg-good' : 'bg-warn'}`}/>
          <span className="meta !normal-case !tracking-normal">
            {provider.groq_available
              ? <>LLM provider online · <span className="font-mono">{provider.model}</span></>
              : <>LLM provider offline — <span className="text-ink">{provider.note}</span> &nbsp;All analytical steps still run against the warehouse.</>}
          </span>
        </div>
      )}

      {/* Question input */}
      <form onSubmit={submit}
            className="mb-4 border border-border rounded-2xl bg-surface p-3 flex gap-2 items-stretch shadow-cardhi">
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Compare TP53 expression across tissues for healthy vs cancer samples."
          rows={2}
          className="!border-none !bg-transparent !p-2 flex-1 !text-[14px] resize-none"
        />
        <button type="submit" disabled={busy || !q.trim()}
                className="btn !self-end !py-2.5 !px-4">
          {busy ? 'Investigating…' : 'Investigate →'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-7">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button"
                  onClick={() => { setQ(ex); run(ex); }}
                  className="pill !py-1 !px-2.5 hover:border-accent hover:bg-accentTint transition !text-[11.5px]">
            {ex}
          </button>
        ))}
      </div>

      {/* 3-column workspace */}
      <div className="grid grid-cols-12 gap-5">
        {/* LEFT — history + context */}
        <aside className="col-span-12 lg:col-span-3">
          <Card title="Investigation history"
                subtitle={session.length ? `${session.length} in this session` : 'Nothing yet.'}>
            {session.length === 0 ? (
              <div className="text-[12.5px] text-muted">
                Pick an example above or type your own question. Every run is
                kept here until you reload the tab.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {session.map((e, i) => (
                  <li key={e.ts}>
                    <button
                      onClick={() => setCurrent(e)}
                      className={`w-full text-left p-2 rounded-lg transition border
                        ${current?.ts === e.ts
                          ? 'bg-accentTint border-accent text-ink'
                          : 'border-transparent hover:bg-canvas'}`}>
                      <div className="text-[12.5px] font-sans text-ink truncate">
                        {e.question}
                      </div>
                      <div className="meta !text-[9.5px] !normal-case !tracking-normal mt-0.5">
                        {new Date(e.ts).toLocaleTimeString()}
                        {' · '}{e.round_trip_ms ?? '—'} ms
                        {' · '}{e.results?.length ?? 0} step(s)
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="mt-4">
            <Card title="Active context">
              {ctx.active.length === 0 ? (
                <div className="text-[12.5px] text-muted">
                  No gene, chromosome, disease or sample is pinned.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {ctx.active.map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between text-[13px]">
                      <span className="meta !text-[10px]">{k}</span>
                      <span className="font-sans font-semibold">{String(v)}</span>
                    </li>
                  ))}
                  <li className="pt-2 border-t border-border mt-2">
                    <button onClick={ctx.clear}
                            className="meta !text-[10px] hover:text-ink underline-offset-4 hover:underline">
                      clear all
                    </button>
                  </li>
                </ul>
              )}
            </Card>
          </div>
        </aside>

        {/* CENTER — plan + results */}
        <section className="col-span-12 lg:col-span-6">
          {!current ? (
            <Card>
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-accentTint flex items-center justify-center mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7656E8" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
                <div className="font-display font-semibold text-xl text-ink">Ask BioVision a question.</div>
                <div className="lede mt-2 text-[14px] max-w-md mx-auto">
                  The planner will pick a short sequence of allowlisted tools,
                  run them against the warehouse, and return a grounded answer.
                </div>
              </div>
            </Card>
          ) : (
            <CurrentInvestigation entry={current}/>
          )}
        </section>

        {/* RIGHT — explanation + provenance */}
        <aside className="col-span-12 lg:col-span-3">
          <ExplanationPanel entry={current}/>
          <div className="mt-4">
            <ProvenancePanel entry={current}/>
          </div>
        </aside>
      </div>
    </div>
  );
}


function CurrentInvestigation({ entry }) {
  if (entry.error) {
    return (
      <Card title="Investigation">
        <div className="text-bad text-[13px]">{entry.error}</div>
      </Card>
    );
  }
  const { plan, results, question } = entry;
  return (
    <div className="space-y-4">
      <Card title="Analytical plan"
            subtitle={plan?.interpretation || question}
            actions={<span className="pill pill-accent !py-1 !text-[10px]">{plan?.source || 'plan'}</span>}>
        <ol className="space-y-2">
          {(plan?.steps || []).map((s, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px]">
              <span className="pill !py-0.5 !px-2 !text-[10px] !tracking-widest shrink-0">STEP {i+1}</span>
              <div>
                <span className="font-mono text-accent2 font-semibold">{s.tool}</span>
                {Object.keys(s.params || {}).length > 0 && (
                  <span className="font-mono text-muted"> ({JSON.stringify(s.params)})</span>
                )}
                <span className="text-muted"> — {s.why}</span>
              </div>
            </li>
          ))}
          {(plan?.rejected || []).map((r, i) => (
            <li key={`r${i}`} className="flex items-start gap-2 text-[12.5px] text-bad">
              <span className="pill !py-0.5 !px-2 !text-[10px]">REJECTED</span>
              <span className="font-mono">{r.tool || '—'}</span>
              <span>— {r.reason}</span>
            </li>
          ))}
        </ol>
        {plan?.limitations && (
          <div className="mt-3 text-[12px] text-muted italic">{plan.limitations}</div>
        )}
      </Card>

      {(results || []).map((r, i) => (
        <ResultBlock key={i} index={i} result={r}/>
      ))}
    </div>
  );
}


function ResultBlock({ index, result }) {
  const [showSql, setShowSql] = useState(false);
  const out = result.output || {};
  const tool = result.tool;

  return (
    <Card title={`Step ${index + 1} · ${tool}`}
          subtitle={result.error ? null : `${result.elapsed_ms} ms`}>
      {result.error ? (
        <div className="text-bad text-[13px]">{result.error}</div>
      ) : (
        <>
          {tool === 'overview' && <ResultOverview data={out}/>}
          {tool === 'mutations_by_type' && <ResultMutByType rows={out.rows}/>}
          {tool === 'rna_by_tissue' && <ResultRna rows={out.rows}/>}
          {tool === 'mutations_for_gene' && <ResultMutForGene rows={out.rows} gene={result.params?.gene}/>}
          {tool === 'gene_card' && <ResultGeneCard card={out.card}/>}
          {tool === 'data_sources' && <ResultSources sources={out.sources}/>}
          {tool === 'warehouse_health' && <ResultHealth status={out}/>}
          {out.sql && (
            <div className="mt-3 border-t border-border pt-2">
              <button onClick={() => setShowSql(v => !v)}
                      className="meta !normal-case !tracking-normal hover:text-ink">
                {showSql ? 'Hide SQL' : 'View SQL'}
              </button>
              {showSql && (
                <pre className="mt-2 bg-ink text-canvas rounded-xl p-3 text-[11px] font-mono whitespace-pre-wrap overflow-x-auto">
{out.sql}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}


/* ---- per-tool renderers ---- */
function ResultOverview({ data }) {
  const t = data?.totals || {};
  return (
    <div className="grid grid-cols-3 gap-2">
      {['genes','mutations','proteins','rna_samples','samples'].map((k) => (
        <div key={k} className="rounded-lg border border-border p-2">
          <div className="meta !text-[9px]">{k.replace('_',' ')}</div>
          <div className="metric-value text-xl">{t[k] ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

function ResultMutByType({ rows = [] }) {
  const data = rows.map((r, i) => ({ ...r, fill: CATS[i % CATS.length] }));
  return (
    <div className="grid grid-cols-2 gap-4 items-center">
      <div className="h-48">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="type"
                 innerRadius={38} outerRadius={70}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} stroke="#171717" strokeWidth={0.5}/>)}
            </Pie>
            <Tooltip/>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1 text-[13px]">
        {data.map((d) => (
          <li key={d.type} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }}/>
            <span className="flex-1">{d.type}</span>
            <span className="font-mono tabular-nums">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultRna({ rows = [] }) {
  if (!rows.length) return <div className="text-muted text-[13px]">No RNA observations matched.</div>;
  // Bucket into tissue groups
  const tissues = Array.from(new Set(rows.map(r => r.tissue)));
  const data = tissues.map(t => {
    const row = { tissue: t };
    for (const r of rows) {
      if (r.tissue !== t) continue;
      row[r.condition || 'all'] = Math.round(r.mean_tpm);
    }
    return row;
  });
  const conditions = Array.from(new Set(rows.map(r => r.condition || 'all')));
  const palette = { healthy: '#A9C59A', cancer: '#C14D5A', diseased: '#C14D5A', all: '#7656E8' };
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -16, right: 4, top: 10 }}>
          <CartesianGrid strokeDasharray="3 3"/>
          <XAxis dataKey="tissue"/>
          <YAxis/>
          <Tooltip/>
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={8}/>
          {conditions.map((c) => (
            <Bar key={c} dataKey={c} fill={palette[c] || '#7656E8'} maxBarSize={22}/>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResultMutForGene({ rows = [], gene }) {
  if (!rows.length) return <div className="text-muted text-[13px]">No catalogue mutations for {gene}.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead>
          <tr><th>ID</th><th>Type</th><th>Consequence</th><th>Position</th><th>Ref → Alt</th><th className="text-right">Freq</th></tr>
        </thead>
        <tbody>
          {rows.slice(0, 12).map((r, i) => (
            <tr key={i}>
              <td className="font-mono">{r.id}</td>
              <td><span className="badge">{r.type}</span></td>
              <td className="text-muted">{r.consequence}</td>
              <td className="num">{r.position}</td>
              <td className="font-mono text-xs">{r.ref} → {r.alt}</td>
              <td className="num text-right">{Number(r.frequency || 0).toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultGeneCard({ card }) {
  if (!card) return null;
  return (
    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-[13px]">
      <Row k="Gene"       v={<span className="font-sans font-semibold">{card.gene_name}</span>}/>
      <Row k="Gene ID"    v={<span className="font-mono">{card.gene_id}</span>}/>
      <Row k="Chromosome" v={<span className="font-mono">{card.chromosome}</span>}/>
      <Row k="Position"   v={<span className="font-mono">{card.start} – {card.end} ({card.strand || '—'})</span>}/>
      <Row k="Biotype"    v={card.biotype}/>
      {card.description && (
        <dd className="col-span-2 text-[12.5px] text-muted italic pt-1">{card.description}</dd>
      )}
    </dl>
  );
}

function ResultSources({ sources = [] }) {
  return (
    <table className="data">
      <thead><tr><th>Source</th><th>Modality</th><th>Role</th></tr></thead>
      <tbody>
        {sources.map((s, i) => (
          <tr key={i}>
            <td className="font-sans font-semibold">{s.name}</td>
            <td className="text-muted">{s.modality}</td>
            <td className="font-mono text-xs">{s.role}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultHealth({ status }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-[13px]">
        <span className={`w-2 h-2 rounded-full ${status.connected ? 'bg-good' : 'bg-bad'}`}/>
        {status.connected ? 'Database reachable' : 'Database unreachable'}
      </div>
      {(status.errors || []).map((e, i) => (
        <div key={i} className="text-[12px] text-bad">{e}</div>
      ))}
      <table className="data mt-2">
        <thead><tr><th>Table</th><th className="text-right">Rows</th></tr></thead>
        <tbody>
          {(status.tables || []).map((t) => (
            <tr key={t.name}>
              <td className="font-mono text-[12px]">{t.name}</td>
              <td className="num text-right">{t.rows ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <>
      <dt className="meta !text-[10px]">{k}</dt>
      <dd className="text-ink">{v}</dd>
    </>
  );
}


function ExplanationPanel({ entry }) {
  const ex = entry?.explanation;
  const title = ex?.source?.startsWith('groq')
    ? 'AI explanation'
    : 'Explanation (deterministic)';
  return (
    <Card title={title}
          subtitle={ex ? (ex.source === 'groq' ? `grounded in the step outputs · model ${ex.model || 'n/a'}` : (ex.note || 'LLM offline — rule-based summary'))
                       : 'run an investigation to see an explanation'}>
      {!ex && <div className="text-[12.5px] text-muted">Nothing to explain yet.</div>}
      {ex && (
        <p className="text-[13.5px] text-ink leading-relaxed whitespace-pre-line">
          {ex.text}
        </p>
      )}
      {ex && (
        <div className="mt-3 pt-2 border-t border-border meta !text-[9.5px]">
          Model-generated prose is labelled; database numbers above are measured.
        </div>
      )}
    </Card>
  );
}


function ProvenancePanel({ entry }) {
  if (!entry || entry.error) return (
    <Card title="Provenance">
      <div className="text-[12.5px] text-muted">—</div>
    </Card>
  );
  const steps = entry.results || [];
  return (
    <Card title="Provenance"
          subtitle="every number traces to one of these steps">
      <ul className="space-y-1.5 text-[12.5px]">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="meta !text-[9.5px]">#{i+1}</span>
            <span className="font-mono text-accent2">{s.tool}</span>
            <span className="meta !text-[10px] !normal-case !tracking-normal ml-auto">
              {s.elapsed_ms} ms{s.error ? ' · failed' : ''}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-2 border-t border-border meta !text-[9.5px]">
        Total round-trip {entry.round_trip_ms ?? '—'} ms
      </div>
      <div className="mt-2 meta !text-[9.5px]">
        LLM provider: {entry.provider_available ? 'online' : 'offline'}
        {entry.provider_note && <> — <span className="normal-case">{entry.provider_note}</span></>}
      </div>
    </Card>
  );
}
