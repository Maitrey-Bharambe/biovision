'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { CvGallery } from '../../components/viz/CvGallery';
import { ConfusionMatrix } from '../../components/viz/ConfusionMatrix';
import { Gauge } from '../../components/viz/Gauge';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

const AXIS = { fontSize: 11, stroke: '#5b7594' };
const TIP  = { background: 'white', border: '1px solid #b8dfe6', borderRadius: 12, fontSize: 12, color: '#0a2540' };

export default function BioVisionPage() {
  const [report, setReport]  = useState(null);
  const [gallery, setGallery] = useState([]);
  const [pred, setPred]      = useState(null);
  const [dna, setDna]        = useState(null);
  const [gene, setGene]      = useState('TP53');
  const [exemplar, setExemplar] = useState('abnormal');
  const [busy, setBusy]      = useState(false);

  useEffect(() => {
    api.cvReport().then(setReport);
    api.cvGallery(12).then((g) => setGallery(g?.items || []));
    api.cvPredict('abnormal').then(setPred);
  }, []);

  const runCnn = async () => {
    setBusy(true);
    setPred(await api.cvPredict(exemplar));
    setBusy(false);
  };

  const runDna = async () => {
    setBusy(true);
    setDna(await api.dnaEncodePredict({ gene, size: 32 }));
    setBusy(false);
  };

  const probs = pred ? Object.entries(pred.probabilities).map(([k, v]) => (
    { class: k === 'malignant' ? 'Abnormal' : 'Normal', prob: v }
  )) : [];

  return (
    <div>
      <PageHeader
        eyebrow="Computer Vision"
        title="BioVision — the AI reads the scan"
        description="A convolutional neural network trained on real MedMNIST breast-ultrasound patches. Below: 12 real test scans with the model's live prediction, a big Grad-CAM view of what the network is looking at, and its confusion matrix."
      />

      {/* --- HERO STATS --------------------------------------------- */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-4" title="Model at a glance"
              subtitle={report?.source}>
          <div className="grid grid-cols-3 gap-3 items-center mt-2">
            <Gauge value={report?.test_accuracy ?? 0} label="Test Acc." tone="teal" />
            <div>
              <div className="text-xs text-muted uppercase tracking-widest">Training</div>
              <div className="text-lg font-display font-bold text-ink">{report?.n_train ?? '—'}</div>
              <div className="text-xs text-muted uppercase tracking-widest mt-3">Test</div>
              <div className="text-lg font-display font-bold text-ink">{report?.n_test ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted uppercase tracking-widest">Classes</div>
              <div className="text-sm mt-1 flex flex-col gap-1">
                <span className="pill">Abnormal</span>
                <span className="pill">Normal</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4" title="Training curve"
              subtitle="loss ↓ · validation accuracy ↑">
          <div className="h-40">
            <ResponsiveContainer>
              <LineChart data={report?.history || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2"/>
                <XAxis dataKey="epoch" {...AXIS}/>
                <YAxis {...AXIS} domain={[0, 1]}/>
                <Tooltip contentStyle={TIP}/>
                <Line dataKey="train_loss"   stroke="#e56b8f" strokeWidth={2.4} dot={false}/>
                <Line dataKey="val_accuracy" stroke="#0ea5b7" strokeWidth={2.4} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[11px] text-muted">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-rose mr-1"/>train loss</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-teal mr-1"/>val accuracy</span>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4" title="Confusion matrix"
              subtitle="how many test scans of each class the model got right">
          {report?.confusion_matrix && (
            <ConfusionMatrix matrix={report.confusion_matrix}
                             labels={['Abnormal','Normal']} size={230}/>
          )}
        </Card>
      </div>

      {/* --- BIG GRAD-CAM ------------------------------------------- */}
      <Card title="What is the model looking at?" subtitle="Original ultrasound (left) · Grad-CAM attention heatmap (right)" className="mb-5">
        <div className="flex gap-2 mb-4">
          <select className="bg-white border border-border rounded px-3 py-2 text-sm"
                  value={exemplar} onChange={(e)=>setExemplar(e.target.value)}>
            <option value="abnormal">Real abnormal ultrasound</option>
            <option value="healthy">Real normal ultrasound</option>
          </select>
          <button className="btn" disabled={busy} onClick={runCnn}>
            {busy ? 'Running…' : 'Predict + Explain'}
          </button>
        </div>
        {pred && (
          <div className="grid md:grid-cols-3 gap-6 items-center">
            <div>
              <div className="text-xs text-muted mb-2 uppercase tracking-widest">Original scan</div>
              <img src={pred.original_image} alt="original"
                   className="w-full rounded-2xl border-2 border-white shadow-cardhi"
                   style={{ imageRendering: 'pixelated' }}/>
            </div>
            <div>
              <div className="text-xs text-muted mb-2 uppercase tracking-widest">Grad-CAM heatmap</div>
              <img src={pred.gradcam} alt="gradcam"
                   className="w-full rounded-2xl border-2 border-white shadow-cardhi"
                   style={{ imageRendering: 'pixelated' }}/>
              <div className="text-[10px] text-muted mt-2">
                Red = strongly influenced the decision. Blue = ignored.
              </div>
            </div>
            <div>
              <div className="text-xs text-muted uppercase tracking-widest mb-3">Model verdict</div>
              <div className="flex items-center gap-4">
                <Gauge value={pred.confidence}
                       tone={pred.prediction === 'abnormal' ? 'rose' : 'teal'}
                       label="Confidence"/>
                <div>
                  <div className="text-3xl font-display font-bold"
                       style={{ color: pred.prediction === 'abnormal' ? '#e56b8f' : '#0ea5b7' }}>
                    {pred.prediction === 'abnormal' ? 'Abnormal' : 'Normal'}
                  </div>
                  <div className="text-xs text-muted mt-1">{pred.source}</div>
                </div>
              </div>
              <div className="mt-5">
                <div className="text-xs text-muted mb-2 uppercase tracking-widest">Class probabilities</div>
                <div className="h-24">
                  <ResponsiveContainer>
                    <BarChart data={probs} layout="vertical" margin={{ left: 60 }}>
                      <XAxis type="number" domain={[0, 1]} {...AXIS} hide/>
                      <YAxis type="category" dataKey="class" {...AXIS} width={80} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={TIP} formatter={(v)=>Number(v).toFixed(3)}/>
                      <Bar dataKey="prob" fill="#0ea5b7" radius={[0,10,10,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* --- GALLERY OF REAL PREDICTIONS ---------------------------- */}
      <Card title="Live gallery — 12 real test scans"
            subtitle="The model's prediction over 12 real BreastMNIST test images. Teal frame = correct · Red frame = wrong."
            className="mb-5">
        <CvGallery items={gallery}/>
      </Card>

      {/* --- DNA-TO-IMAGE EXPERIMENT -------------------------------- */}
      <Card title="Experimental — encode a DNA sequence as a 2-D image and run the CNN"
            subtitle="A → blue · C → red · G → green · T → amber · reshaped into a 32×32 matrix and fed to the CNN. This is a computational visualization of sequence data, not a physical image of DNA.">
        <div className="flex gap-2 mb-4">
          <input className="bg-white border border-border rounded px-3 py-2 text-sm flex-1 max-w-xs"
                 value={gene} onChange={(e)=>setGene(e.target.value)} placeholder="Gene name"/>
          <button className="btn" disabled={busy} onClick={runDna}>
            {busy ? 'Running…' : 'Encode + Predict'}
          </button>
        </div>
        {dna && (
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-muted mb-2 uppercase tracking-widest">DNA-encoded image</div>
              <img src={dna.dna_image} alt="dna" className="w-full max-w-[240px] rounded-2xl border-2 border-white shadow-cardhi"
                   style={{ imageRendering: 'pixelated' }}/>
            </div>
            <div>
              <div className="text-xs text-muted mb-2 uppercase tracking-widest">Grad-CAM</div>
              <img src={dna.gradcam} alt="gradcam" className="w-full max-w-[240px] rounded-2xl border-2 border-white shadow-cardhi"
                   style={{ imageRendering: 'pixelated' }}/>
            </div>
            <div>
              <Gauge value={dna.confidence} tone="teal" label="Confidence" hint={dna.prediction}/>
              <div className="text-[10px] text-muted mt-3">{dna.disclaimer}</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
