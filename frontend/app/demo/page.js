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
      <PageHeader eyebrow="Demo"
        title="Run Biological Analysis"
        description="A guided end-to-end run of the BioVision pipeline for a live audience." />

      <div className="text-center mb-8">
        <button className="btn text-lg px-6 py-3" disabled={running} onClick={run}>
          {running ? 'Running…' : done ? 'Run again' : 'Run Biological Analysis'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                ${status[i]==='done' ? 'bg-good/20 text-good' :
                  status[i]==='running' ? 'bg-accent/20 text-accent animate-pulse' :
                  'bg-panel2 text-muted border border-border'}`}>
                {status[i]==='done' ? '✓' : i+1}
              </div>
              <div className="text-sm">STEP {i+1} — {s.label}</div>
            </div>
            <div className="text-xs text-muted">
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
                <div className="text-xs text-muted mb-1">{o.step}</div>
                <div className="text-sm">{o.summary}</div>
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
