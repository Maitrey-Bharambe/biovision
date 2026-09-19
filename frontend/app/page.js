'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Card } from '../components/Card';
import { Hero } from '../components/Hero';
import { TopBar } from '../components/dashboard/SearchBar';
import { ChromosomeIdeogram } from '../components/dashboard/ChromosomeIdeogram';
import { MutationDonut } from '../components/dashboard/MutationDonut';
import { ProteinStructure } from '../components/dashboard/ProteinStructure';
import { InsightsPanel } from '../components/dashboard/InsightsPanel';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

const AXIS = { fontSize: 11, stroke: '#5b7594' };
const TIP  = { background: 'white', border: '1px solid #b8dfe6', borderRadius: 12, fontSize: 12, color: '#0a2540' };

export default function Overview() {
  const [data, setData]         = useState(null);
  const [rnaTP53, setRnaTP53]   = useState([]);
  const [cvPred, setCvPred]     = useState(null);
  const [geneDetail, setGD]     = useState(null);

  useEffect(() => {
    api.overview().then(setData);
    api.rna('gene=TP53&limit=40').then((rows) => {
      if (!rows) return;
      // Bar-chart data: bucket samples by tissue with two series (healthy vs cancer)
      const buckets = {};
      rows.forEach(r => {
        buckets[r.tissue] = buckets[r.tissue] || { tissue: r.tissue, Healthy: 0, Cancer: 0, hn: 0, cn: 0 };
        if (r.condition === 'healthy')  { buckets[r.tissue].Healthy += r.tpm || 0; buckets[r.tissue].hn++; }
        else                             { buckets[r.tissue].Cancer  += r.tpm || 0; buckets[r.tissue].cn++; }
      });
      const arr = Object.values(buckets).map(b => ({
        tissue: b.tissue,
        Healthy: b.hn ? Math.round(b.Healthy / b.hn) : 0,
        Cancer:  b.cn ? Math.round(b.Cancer  / b.cn) : 0,
      }));
      setRnaTP53(arr);
    });
    api.cvPredict('abnormal').then(setCvPred);
    api.gene('TP53').then(setGD);
  }, []);

  const totals = data?.totals || {};

  return (
    <div>
      <TopBar user="Researcher" />

      <Hero totals={totals} />

      {/* Row 1: Genome Overview + RNA Expression + Protein Structure + Mutation Distribution */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        <Card className="col-span-12 lg:col-span-6"
              title="Genome Overview"
              actions={<Selector value="Chromosome 17" />}>
          <ChromosomeIdeogram chromosome="17" lengthMb={83.3}
                              mutationPos={0.65} mutationLabel="TP53" />
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3" title="RNA Expression (TP53)">
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={rnaTP53} margin={{ left: -20, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0eff2" vertical={false}/>
                <XAxis dataKey="tissue" {...AXIS} tickLine={false} axisLine={false}/>
                <YAxis {...AXIS} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={TIP} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={7}/>
                <Bar dataKey="Healthy" fill="#2f6df1" radius={[6,6,0,0]} maxBarSize={16}/>
                <Bar dataKey="Cancer"  fill="#e56b8f" radius={[6,6,0,0]} maxBarSize={16}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-3"
              title="Protein Structure"
              actions={<Selector value="p53" />}>
          <ProteinStructure gene="p53" />
        </Card>
      </div>

      {/* Row 2: TP53 detail + Biological Image + Insights + Mutation Distribution */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {/* TP53 detail card */}
        <Card className="col-span-12 lg:col-span-4" title="TP53" actions={<span className="pill">Tumor Suppressor</span>}>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Chromosome',   geneDetail?.chromosome   || '17'],
                ['Position',     geneDetail?.start ? geneDetail.start.toLocaleString() : '7,668,421'],
                ['Reference',    'C'],
                ['Alternate',    'T'],
                ['Mutation Type','SNP'],
                ['Expression',   <span key="e" className="text-teal font-semibold">High (RNA-seq)</span>],
              ].map(([k,v]) => (
                <tr key={k} className="border-b border-border/40 last:border-0">
                  <td className="py-2 text-muted">{k}</td>
                  <td className="py-2 font-medium text-ink">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 h-32 rounded-2xl bg-gradient-to-br from-[#eaf8fb] to-[#c8dcf0] flex items-center justify-center">
            <CellIcon />
          </div>
        </Card>

        {/* Biological Image (real CNN output) */}
        <Card className="col-span-12 lg:col-span-4" title="Biological Image (Ultrasound)"
              actions={<span className="text-muted text-lg cursor-pointer">⛶</span>}>
          {cvPred ? (
            <div className="grid grid-cols-2 gap-3 items-center">
              <img src={cvPred.original_image} alt="scan" className="w-full rounded-2xl border border-border shadow-card"
                   style={{ imageRendering: 'pixelated' }}/>
              <div>
                <div className="text-xs text-muted">Prediction</div>
                <div className={`text-xl font-display font-bold ${cvPred.prediction === 'abnormal' ? 'text-rose' : 'text-teal'}`}>
                  {cvPred.prediction === 'abnormal' ? 'Abnormal' : 'Normal'}
                </div>
                <div className="text-xs text-muted mt-3">Confidence</div>
                <div className="text-3xl font-display font-bold text-ink metric-value">
                  {(cvPred.confidence * 100).toFixed(1)}%
                </div>
                <Link href="/biovision" className="mt-4 inline-flex items-center gap-2 text-sm text-ink font-medium">
                  View Analysis
                  <span className="w-6 h-6 rounded-full bg-deep text-white flex items-center justify-center text-xs">→</span>
                </Link>
              </div>
            </div>
          ) : <div className="text-muted text-sm">Running CV…</div>}
          <div className="mt-3 text-[10px] text-muted">
            Source: MedMNIST/BreastMNIST · real breast ultrasound patches
          </div>
        </Card>

        {/* Insights */}
        <Card className="col-span-12 lg:col-span-4" title="Insights">
          <InsightsPanel items={[
            { icon: 'correlation', title: 'Gene–Protein Correlation',
              body: 'TP53 expression correlates with p53 protein abundance.',
              href: '/protein' },
            { icon: 'hotspot', title: 'Mutation Hotspot',
              body: 'High mutation frequency observed in chromosome 17.',
              href: '/mutation' },
            { icon: 'cluster', title: 'Clustering Result',
              body: 'Sample WDBC0104 falls into a distinct high-risk cluster.',
              href: '/ai-lab' },
          ]}/>
        </Card>
      </div>

      {/* Row 3: Mutation Distribution donut */}
      <div className="grid grid-cols-12 gap-5 mb-8">
        <Card className="col-span-12 lg:col-span-5" title="Mutation Distribution">
          <MutationDonut data={data?.mutation_by_type || []} total={totals.mutations} />
        </Card>

        <Card className="col-span-12 lg:col-span-7"
              title="Central biology"
              subtitle="Every insight surfaces from the DNA → RNA → Protein → Cell → Phenotype chain">
          <div className="flex items-center justify-around mt-4 flex-wrap gap-3">
            {['DNA','GENE','RNA','PROTEIN','CELL','PHENOTYPE'].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-[#d5eef4] border border-border flex items-center justify-center">
                    <span className="text-teal text-xs font-semibold">{s}</span>
                  </div>
                </div>
                {i < arr.length - 1 && <span className="text-teal">→</span>}
              </div>
            ))}
          </div>
          <div className="text-xs text-muted mt-6 text-center leading-relaxed">
            Data sources: <span className="font-medium">Ensembl</span> (gene coordinates),
            {' '}<span className="font-medium">UniProt</span> (proteins),
            {' '}<span className="font-medium">ClinVar/COSMIC</span> (mutations),
            {' '}<span className="font-medium">GTEx / TCGA-BRCA</span> (expression),
            {' '}<span className="font-medium">UCI WDBC · Kaggle</span> (samples),
            {' '}<span className="font-medium">MedMNIST</span> (imaging).
          </div>
        </Card>
      </div>

      {/* Footer strip */}
      <div className="flex items-center justify-between text-xs text-muted pt-4 border-t border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal to-deep"/>
          <span className="text-ink font-semibold">BioVision</span>
          <span>v1.0.0</span>
        </div>
        <div>Integrating Data. Empowering Discovery.</div>
        <div className="flex gap-5">
          <Link href="/warehouse">About</Link>
          <Link href="/warehouse">Documentation</Link>
          <Link href="/demo">Contact</Link>
        </div>
      </div>
    </div>
  );
}

function Selector({ value }) {
  return (
    <div className="pill !py-1.5 !px-3 gap-2">
      {value}
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 4l4 4 4-4" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function CellIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="cIcon" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f0fbff"/>
          <stop offset="60%" stopColor="#7c8fd6"/>
          <stop offset="100%" stopColor="#37478f"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#cIcon)"/>
      <ellipse cx="40" cy="40" rx="16" ry="8" fill="#ffffff" opacity="0.5"/>
      <circle cx="55" cy="55" r="12" fill="#0a2540" opacity="0.35"/>
    </svg>
  );
}
