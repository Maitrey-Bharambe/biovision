'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';

export default function SampleDetail({ params }) {
  const { id } = params;
  const [s, setS] = useState(null);
  const [cv, setCv] = useState(null);
  const [assoc, setAssoc] = useState(null);
  const [anom, setAnom] = useState(null);

  useEffect(() => {
    api.sample(id).then(setS);
    api.cvPredict('abnormal').then(setCv);
    api.associations().then(setAssoc);
    api.anomalies().then((a) => {
      if (!a) return;
      setAnom(a.samples?.find(x => x.sample_id === id) || null);
    });
  }, [id]);

  if (!s) return <div className="text-muted">Loading sample…</div>;

  return (
    <div>
      <PageHeader
        eyebrow="Sample"
        title={`Sample ${s.sample_id}`}
        description={`${s.condition} · ${s.tissue} · ${s.sex} · age ${s.age_bucket}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card title="Genomic profile" subtitle={`${s.genes?.length ?? 0} genes observed`}>
          <div className="scrollbox" style={{maxHeight: '16rem'}}>
            {s.genes?.map((g, i) => <div key={i} className="text-sm">• {g.gene}</div>)}
          </div>
        </Card>

        <Card title="Mutations" subtitle={`${s.mutations?.length ?? 0} mutations`}>
          <div className="scrollbox" style={{maxHeight: '16rem'}}>
            {s.mutations?.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="badge mr-1">{m.type}</span>
                <span className="text-accent">{m.gene}</span>{' '}
                <span className="text-muted">{m.consequence}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="RNA expression" subtitle="per-gene values">
          <div className="scrollbox" style={{maxHeight: '16rem'}}>
            {s.rna_expression?.map((r, i) => (
              <div key={i} className="text-sm flex justify-between">
                <span>{r.gene}</span>
                <span className="tabular-nums text-accent">{r.expression.toFixed(2)}</span>
                <span className="badge">{r.category}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card title="Proteins">
          <div className="scrollbox" style={{maxHeight: '16rem'}}>
            {s.proteins?.map((p, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{p.protein_id}</span>
                {' · '} <span className="text-accent">{p.gene}</span>
                {' · '} abundance <span className="tabular-nums">{p.abundance.toFixed(2)}</span>
                {' · '} <span className="text-muted">{p.location}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Biological image + CV" subtitle="run of the trained CNN with Grad-CAM">
          {cv ? (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <img src={cv.original_image} alt="orig" className="w-full rounded border border-border" />
                <img src={cv.gradcam}       alt="cam"  className="w-full rounded border border-border" />
              </div>
              <div className="mt-3 flex justify-between text-sm">
                <div>Prediction: <span className={cv.prediction==='abnormal' ? 'text-warn' : 'text-good'}>{cv.prediction}</span></div>
                <div className="metric-value text-accent">{(cv.confidence*100).toFixed(1)}%</div>
              </div>
            </div>
          ) : <div className="text-muted text-sm">Running CV…</div>}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Associated rules" subtitle="top rules found across the warehouse">
          {assoc?.rules?.slice(0, 6).map((r, i) => (
            <div key={i} className="text-xs border-b border-border/40 py-2">
              <div>{r.antecedents.join(' + ')} → <span className="text-accent">{r.consequents.join(', ')}</span></div>
              <div className="text-muted mt-1">
                support {r.support} · confidence {r.confidence} · lift <span className="text-good">{r.lift}</span>
              </div>
            </div>
          )) || <div className="text-muted text-sm">No rules yet.</div>}
        </Card>

        <Card title="Anomaly score" subtitle="Isolation Forest on the feature matrix">
          {anom ? (
            <div>
              <div className="text-3xl metric-value mt-2" style={{ color: anom.anomaly ? '#f87171' : '#34d399' }}>
                {anom.score.toFixed(3)}
              </div>
              <div className="text-sm mt-1">{anom.anomaly ? 'Flagged as anomalous' : 'Within normal range'}</div>
              <div className="text-xs text-muted mt-2">Condition: {anom.condition}</div>
            </div>
          ) : <div className="text-muted text-sm">No score.</div>}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
        {['DNA','RNA','Protein','Image'].map(l => (
          <div key={l} className="card">
            <div className="card-heading">{l} encoder</div>
            <div className="text-lg text-accent">✓</div>
          </div>
        ))}
      </div>
      <div className="text-center text-accent mt-2 text-xl">↓ fused feature vector ↓</div>
      <div className="card text-center">
        <div className="card-heading">Prediction</div>
        <div className="mt-2">
          {s.disease_predictions?.[0]
            ? <span className="text-accent text-lg">{s.disease_predictions[0].disease}</span>
            : <span className="text-muted">no ML prediction</span>}
        </div>
      </div>
    </div>
  );
}
