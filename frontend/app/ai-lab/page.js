'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { ConfusionMatrix } from '../../components/viz/ConfusionMatrix';
import { RocCurve } from '../../components/viz/RocCurve';
import { AssociationGraph } from '../../components/viz/AssociationGraph';
import { Gauge } from '../../components/viz/Gauge';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

const AXIS = { fontSize: 11, stroke: '#5b7594' };
const TIP  = { background: 'white', border: '1px solid #b8dfe6', borderRadius: 12, fontSize: 12, color: '#0a2540' };
const TABS = ['Classification', 'Clustering', 'Association', 'Anomaly'];

export default function AiLab() {
  const [tab, setTab] = useState('Classification');
  const [cls, setCls] = useState(null);
  const [clu, setClu] = useState(null);
  const [asn, setAsn] = useState(null);
  const [ano, setAno] = useState(null);

  useEffect(() => {
    api.classification().then(setCls);
    api.clusters().then(setClu);
    api.associations().then(setAsn);
    api.anomalies().then(setAno);
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence"
        title="AI & Mining Lab"
        description="Four data-mining modules trained on the real warehouse. Every tab shows model metrics, its errors, and the samples it flagged."
      />

      <div className="flex gap-2 mb-6 border-b border-border/60">
        {TABS.map(t => (
          <button key={t}
                  className={`px-4 py-2 text-sm border-b-2 ${
                    tab === t ? 'border-teal text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                  }`}
                  onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'Classification' && <ClassificationTab data={cls} />}
      {tab === 'Clustering'     && <ClusteringTab     data={clu} />}
      {tab === 'Association'    && <AssociationTab    data={asn} />}
      {tab === 'Anomaly'        && <AnomalyTab        data={ano} />}
    </div>
  );
}

/* ================================================================= */
/*  CLASSIFICATION                                                    */
/* ================================================================= */
function ClassificationTab({ data }) {
  const [inp, setInp] = useState({});
  const [pred, setPred] = useState(null);

  useEffect(() => {
    if (data?.features) {
      const base = {};
      data.features.forEach(f => base[f] = 0);
      setInp(base);
    }
  }, [data]);

  if (!data) return <div className="text-muted">Train the classifier first.</div>;

  const importance = data.feature_importances
    ? Object.entries(data.feature_importances)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 12)
        .map(([k,v]) => ({ feature: k.replace(/_/g, ' '), importance: v }))
    : [];
  const results = Object.entries(data.results).map(([m, v]) => ({ model: m, ...v }));
  const bestConf = data.results[data.best]?.confusion_matrix;
  const submit = async () => setPred(await api.classifyPredict(inp));

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-3" title="Dataset"
              subtitle={data.dataset}>
          <div className="space-y-3 mt-2">
            <Stat label="Samples"  v={data.n_samples}/>
            <Stat label="Features" v={data.n_features}/>
            <Stat label="Best model" v={data.best} tone="teal"/>
          </div>
          <div className="text-[10px] text-muted mt-4 uppercase tracking-widest">Source</div>
          <div className="text-xs text-ink2 mt-1 leading-snug">{data.source}</div>
        </Card>

        <Card className="col-span-12 lg:col-span-5" title="ROC Curve"
              subtitle={`AUC ${data.roc?.auc ?? '—'} on ${data.best}`}>
          <RocCurve fpr={data.roc?.fpr || []} tpr={data.roc?.tpr || []} auc={data.roc?.auc ?? 0}/>
        </Card>

        <Card className="col-span-12 lg:col-span-4" title="Confusion matrix"
              subtitle={`Best model · ${data.best}`}>
          {bestConf && <ConfusionMatrix matrix={bestConf} labels={['Healthy','Diseased']} size={230}/>}
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-6" title="Model comparison"
              subtitle="Five algorithms trained on identical splits">
          <table className="data">
            <thead>
              <tr><th>Model</th><th>Acc</th><th>Prec</th><th>Recall</th><th>F1</th></tr>
            </thead>
            <tbody>
              {results.map((r,i) => (
                <tr key={i} className={r.model===data.best ? 'font-semibold text-teal' : ''}>
                  <td>{r.model}</td>
                  <td className="tabular-nums">{r.accuracy}</td>
                  <td className="tabular-nums">{r.precision}</td>
                  <td className="tabular-nums">{r.recall}</td>
                  <td className="tabular-nums">{r.f1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="col-span-12 lg:col-span-6" title="Feature importance"
              subtitle="Top signals the model uses to separate healthy from diseased">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={importance} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis type="number" {...AXIS}/>
                <YAxis type="category" dataKey="feature" {...AXIS} width={160} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TIP}/>
                <Bar dataKey="importance" fill="#0ea5b7" radius={[0,10,10,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Try it — enter feature values and see the diagnosis"
            subtitle="The classifier runs live on your inputs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {(data.features || []).slice(0, 10).map(f => (
            <label key={f} className="text-xs text-muted">
              {f.replace(/_/g, ' ')}
              <input type="number" step="0.01" value={inp[f] ?? 0}
                     onChange={(e) => setInp(prev => ({ ...prev, [f]: Number(e.target.value) }))}
                     className="mt-1 w-full bg-white border border-border rounded px-2 py-1 text-sm"/>
            </label>
          ))}
        </div>
        <button className="btn" onClick={submit}>Predict</button>
        {pred && (
          <div className="mt-5 flex items-center gap-6">
            <Gauge value={pred.probabilities?.diseased ?? 0}
                   tone={pred.prediction === 'diseased' ? 'rose' : 'teal'}
                   label="P(diseased)"/>
            <div>
              <div className="text-3xl font-display font-bold"
                   style={{ color: pred.prediction === 'diseased' ? '#e56b8f' : '#0ea5b7' }}>
                {pred.prediction === 'diseased' ? 'Diseased' : 'Healthy'}
              </div>
              {pred.probabilities && (
                <div className="text-sm text-muted mt-1">
                  healthy {(pred.probabilities.healthy*100).toFixed(1)}% · diseased {(pred.probabilities.diseased*100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

/* ================================================================= */
/*  CLUSTERING                                                         */
/* ================================================================= */
function ClusteringTab({ data }) {
  if (!data) return <div className="text-muted">Train clustering first.</div>;
  const colors = ['#0ea5b7', '#e56b8f', '#f4b942', '#7fe3d4', '#a78bfa'];
  const sizes = data.kmeans?.cluster_sizes || {};
  const total = Object.values(sizes).reduce((a,b)=>a+b,0) || 1;

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-3" title="K-Means">
          <div className="space-y-3 mt-2">
            <Stat label="k" v={data.kmeans.k}/>
            <Stat label="Silhouette" v={data.kmeans.silhouette} tone="teal"/>
            <Stat label="Inertia" v={data.kmeans.inertia}/>
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-3" title="DBSCAN">
          <div className="space-y-3 mt-2">
            <Stat label="Clusters" v={data.dbscan.n_clusters}/>
            <Stat label="Noise pts" v={data.dbscan.n_noise} tone="rose"/>
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-6" title="Cluster spotlights"
              subtitle="Sizes of each K-Means cluster in the WDBC feature space">
          <div className="space-y-3">
            {Object.entries(sizes).map(([id, n], i) => {
              const pct = (n / total) * 100;
              return (
                <div key={id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink font-semibold">
                      <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
                            style={{ background: colors[i % colors.length] }}/>
                      Cluster {id}
                    </span>
                    <span className="text-muted">{n} samples · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eaf8fb]">
                    <div className="h-full rounded-full"
                         style={{ background: colors[i % colors.length], width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card title="PCA projection · coloured by K-Means cluster"
            subtitle="Each dot is one real WDBC patient projected into 2D. Clusters here separate the tumour-signature space.">
        <div className="h-96">
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
              <XAxis type="number" dataKey="x" stroke="#5b7594" fontSize={11} name="PC1"/>
              <YAxis type="number" dataKey="y" stroke="#5b7594" fontSize={11} name="PC2"/>
              <ZAxis dataKey="sample_id" range={[80,80]}/>
              <Tooltip contentStyle={TIP} cursor={{ strokeDasharray:'3 3' }}/>
              <Scatter data={data.points}>
                {data.points.map((p, i) => (
                  <Cell key={i} fill={colors[p.kmeans_label % colors.length]}/>
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}

/* ================================================================= */
/*  ASSOCIATION                                                        */
/* ================================================================= */
function AssociationTab({ data }) {
  if (!data) return <div className="text-muted">Run mining first.</div>;
  if (!data.rules?.length) return <div className="text-muted">No rules met the thresholds.</div>;

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-8" title="Rule network"
              subtitle={`Every arrow is one association rule. Thickness ∝ lift · Opacity ∝ confidence · ${data.n_transactions} transactions.`}>
          <div className="rounded-2xl bg-white/70 p-2">
            <AssociationGraph rules={data.rules}/>
          </div>
        </Card>
        <Card className="col-span-12 lg:col-span-4" title="Mining settings">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Transactions</span><span className="font-semibold">{data.n_transactions}</span></div>
            <div className="flex justify-between"><span className="text-muted">Min support</span><span className="font-semibold">{data.min_support}</span></div>
            <div className="flex justify-between"><span className="text-muted">Min confidence</span><span className="font-semibold">{data.min_confidence}</span></div>
            <div className="flex justify-between"><span className="text-muted">Max itemset len</span><span className="font-semibold">{data.max_itemset_length}</span></div>
            <div className="flex justify-between"><span className="text-muted">Rules kept</span><span className="font-semibold text-teal">{data.rules.length}</span></div>
          </div>
          <div className="text-[10px] text-muted mt-4 leading-relaxed">
            These are dataset-derived associations, not causal biological claims.
          </div>
        </Card>
      </div>

      <Card title="Top rules by lift">
        <div className="scrollbox">
          <table className="data">
            <thead>
              <tr><th>Antecedent</th><th>→</th><th>Consequent</th><th>Support</th><th>Confidence</th><th>Lift</th></tr>
            </thead>
            <tbody>
              {data.rules.slice(0, 25).map((r,i) => (
                <tr key={i}>
                  <td className="max-w-xs text-xs">
                    {r.antecedents.map((a,j) => <span key={j} className="badge mr-1 mb-1 inline-block">{a}</span>)}
                  </td>
                  <td className="text-teal font-bold">→</td>
                  <td className="max-w-xs text-xs">
                    {r.consequents.map((c,j) => <span key={j} className="badge mr-1 mb-1 inline-block">{c}</span>)}
                  </td>
                  <td className="tabular-nums">{r.support}</td>
                  <td className="tabular-nums text-teal">{r.confidence}</td>
                  <td className="tabular-nums font-semibold">{r.lift}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ================================================================= */
/*  ANOMALY                                                            */
/* ================================================================= */
function AnomalyTab({ data }) {
  if (!data) return <div className="text-muted">Train anomaly first.</div>;
  const flagged = (data.samples || []).filter(s => s.anomaly).length;
  const rate = data.n_samples ? flagged / data.n_samples : 0;

  return (
    <>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-3" title="Model">
          <div className="text-sm mt-1">Isolation Forest</div>
          <div className="text-xs text-muted mt-1">contamination = {data.contamination}</div>
          <div className="mt-6"><Gauge value={rate} tone="rose" label="Anomaly rate" hint={`${flagged}/${data.n_samples}`}/></div>
        </Card>

        <Card className="col-span-12 lg:col-span-6" title="Anomaly score distribution"
              subtitle="Every WDBC patient is a point. Red = flagged as anomalous.">
          <div className="h-80">
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis type="number" dataKey="idx" {...AXIS}/>
                <YAxis type="number" dataKey="score" {...AXIS}/>
                <Tooltip contentStyle={TIP}/>
                <Scatter data={data.samples.map((s,i)=>({ idx:i, ...s }))}>
                  {data.samples.map((s,i)=>(
                    <Cell key={i} fill={s.anomaly ? '#e56b8f' : '#0ea5b7'}/>
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-3" title="Top anomalies">
          <div className="scrollbox space-y-1" style={{maxHeight:'20rem'}}>
            {data.top_anomalous.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/70">
                <span className="font-medium text-rose">{s.sample_id}</span>
                <span className="tabular-nums font-semibold text-ink">{s.score}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, v, tone='default' }) {
  const c = { default:'text-ink', teal:'text-teal', rose:'text-rose' }[tone];
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-2xl font-display font-bold ${c}`}>{v ?? '—'}</div>
    </div>
  );
}
