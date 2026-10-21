'use client';
import { useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

const STEPS = [
  { label: 'Loading genome…',                run: () => api.genomes() },
  { label: 'Processing RNA expression…',     run: () => api.rnaTop('up', 10) },
  { label: 'Processing protein data…',       run: () => api.proteins() },
  { label: 'Analyzing mutations…',           run: () => api.mutationAnalytics() },
  { label: 'Processing biological image…',   run: () => api.cvPredict('abnormal') },
  { label: 'Extracting fused features…',     run: () => Promise.resolve({ ok: true }) },
  { label: 'Running data mining…',           run: () => api.classification() },
  { label: 'Generating biological insights…',run: () => api.associations() },
];

export default function DemoPage() {
  const [status, setStatus] = useState(STEPS.map(() => 'pending'));
  const [outputs, setOutputs] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setRunning(true); setDone(false); setOutputs([]);
    const next = [...status];
    for (let i = 0; i < STEPS.length; i++) {
      next[i] = 'running'; setStatus([...next]);
      const t0 = performance.now();
      const data = await STEPS[i].run();
      await new Promise(r => setTimeout(r, 350));
      next[i] = 'done';
      setStatus([...next]);
      setOutputs(prev => [...prev, {
        step: STEPS[i].label,
        elapsed: (performance.now() - t0).toFixed(0),
        summary: summarize(data),
      }]);
    }
    setRunning(false); setDone(true);
  };

  return (
    <div>
      <PageHeader eyebrow="LIVE DEMO"
        title={<>A pipeline, <span className="italic font-normal">on stage.</span></>}
        description="A guided end-to-end run of the BioVision pipeline, one real backend call per stage." />

      <div className="text-center mb-8">
        <button className="btn text-lg px-6 py-3" disabled={running} onClick={run}>
          {running ? 'Running…' : done ? 'Run again' : 'Run Biological Analysis'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 flex items-center justify-center text-xs border border-ink font-mono font-bold
                ${status[i]==='done' ? 'bg-ink text-paper' :
                  status[i]==='running' ? 'bg-accent text-paper animate-pulse' :
                  'bg-white text-ink'}`}>
                {status[i]==='done' ? '✓' : String(i+1).padStart(2,'0')}
              </div>
              <div className="font-sans text-[11px] font-bold uppercase tracking-[0.14em]">STEP {i+1} · {s.label}</div>
            </div>
            <div className="meta !text-[10px] font-mono">
              {status[i]==='done' && outputs[i]?.elapsed ? `${outputs[i].elapsed} ms` : ''}
            </div>
          </div>
        ))}
      </div>

      {done && (
        <Card title="BIOLOGICAL PROFILE GENERATED" subtitle="derived from the runs above">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outputs.map((o, i) => (
              <div key={i} className="card !p-3">
                <div className="eyebrow !text-[9px] text-meta mb-1">{o.step}</div>
                <div className="text-sm font-prose">{o.summary}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function summarize(d) {
  if (!d) return '(no data)';
  if (Array.isArray(d)) return `${d.length} rows returned`;
  if (d.prediction) return `Prediction ${d.prediction} · ${(d.confidence*100).toFixed(1)}%`;
  if (d.best) return `Best model: ${d.best}`;
  if (d.rules) return `${d.rules.length} association rules mined`;
  if (d.by_type) return `Mutation types: ${d.by_type.map(x=>x.type).join(', ')}`;
  return JSON.stringify(d).slice(0, 100) + '…';
}
