'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Hero } from '../components/Hero';
import { Ticker } from '../components/Ticker';
import { FeatureSection } from '../components/FeatureSection';
import { ChromosomeIdeogram } from '../components/dashboard/ChromosomeIdeogram';
import { MutationDonut } from '../components/dashboard/MutationDonut';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

const AXIS = { fontSize: 10, stroke: '#525252' };
const TIP  = { background: 'white', border: '1px solid #111111', borderRadius: 0, fontSize: 11, color: '#111111', fontFamily: 'JetBrains Mono, monospace' };

export default function Overview() {
  const [data, setData]       = useState(null);
  const [rnaTP53, setRnaTP53] = useState([]);
  const [cvPred, setCvPred]   = useState(null);

  useEffect(() => {
    api.overview().then(setData);
    api.rna('gene=TP53&limit=40').then((rows) => {
      if (!rows) return;
      const buckets = {};
      rows.forEach(r => {
        buckets[r.tissue] = buckets[r.tissue] || { tissue: r.tissue, Healthy: 0, Cancer: 0, hn: 0, cn: 0 };
        if (r.condition === 'healthy')  { buckets[r.tissue].Healthy += r.tpm || 0; buckets[r.tissue].hn++; }
        else                             { buckets[r.tissue].Cancer  += r.tpm || 0; buckets[r.tissue].cn++; }
      });
      setRnaTP53(Object.values(buckets).map(b => ({
        tissue: b.tissue,
        Healthy: b.hn ? Math.round(b.Healthy / b.hn) : 0,
        Cancer:  b.cn ? Math.round(b.Cancer  / b.cn) : 0,
      })));
    });
    api.cvPredict('abnormal').then(setCvPred);
  }, []);

  const totals = data?.totals || {};
  const tickerItems = [
    { label: 'Observations',    value: totals.observations ?? totals.samples ?? null },
    { label: 'Genes',           value: totals.genes ?? null },
    { label: 'Mutations',       value: totals.mutations ?? null },
    { label: 'RNA Samples',     value: totals.rna_samples ?? null },
    { label: 'Proteins',        value: totals.proteins ?? null },
    { label: 'Indexed Images',  value: totals.images ?? null },
    { label: 'Diseases',        value: totals.diseases ?? null },
  ];

  return (
    <div>
      <Hero totals={totals} />

      {/* Live warehouse ticker */}
      <Ticker items={tickerItems} />

      {/* ================= FEATURE GRID ================= */}
      <div className="grid grid-cols-12 gap-5 mt-10">

        <FeatureSection
          index="01"
          eyebrow="GENOMICS"
          title="A chromosome, in print."
          blurb="A clickable ideogram over the warehouse's gene coordinates. Mutation markers come from ClinVar &amp; COSMIC."
          href="/genome"
          cta="Enter the genome explorer →"
          columns={8}
        >
          <div className="pt-2">
            <ChromosomeIdeogram chromosome="17" lengthMb={83.3}
                                mutationPos={0.65} mutationLabel="TP53" />
          </div>
        </FeatureSection>

        <FeatureSection
          index="02"
          eyebrow="MUTATIONS"
          title="Catalogue of change."
          blurb="Distribution of variant consequences across the warehouse's mutation table."
          href="/mutation"
          cta="Open mutation analytics →"
          columns={4}
        >
          <MutationDonut data={data?.mutation_by_type || []} total={totals.mutations} />
        </FeatureSection>

        <FeatureSection
          index="03"
          eyebrow="TRANSCRIPTOMICS"
          title="TP53, by tissue."
          blurb="Mean TPM for healthy vs. cancer samples, aggregated from the live RNA table."
          href="/rna"
          cta="Compare more genes →"
          columns={7}
        >
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={rnaTP53} margin={{ left: -16, right: 4, top: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#11111120" vertical={false}/>
                <XAxis dataKey="tissue" {...AXIS} tickLine={false} axisLine={{ stroke: '#111' }}/>
                <YAxis {...AXIS} tickLine={false} axisLine={{ stroke: '#111' }}/>
                <Tooltip contentStyle={TIP} />
                <Legend wrapperStyle={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em' }} iconType="square" iconSize={8}/>
                <Bar dataKey="Healthy" fill="#1F4E79" maxBarSize={18}/>
                <Bar dataKey="Cancer"  fill="#CC0000" maxBarSize={18}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FeatureSection>

        <FeatureSection
          index="04"
          eyebrow="COMPUTER VISION"
          title="Ultrasound, interpreted."
          blurb="A live inference pass from the trained CNN on a BreastMNIST patch, with model confidence."
          href="/biovision"
          cta="See Grad-CAM overlays →"
          columns={5}
        >
          {cvPred ? (
            <div className="grid grid-cols-2 gap-4 items-center pt-1">
              <img src={cvPred.original_image} alt="ultrasound scan"
                   className="w-full border border-ink"
                   style={{ imageRendering: 'pixelated' }} />
              <div>
                <div className="eyebrow text-meta !text-[10px]">Prediction</div>
                <div className={`font-display font-bold text-3xl mt-1 ${cvPred.prediction === 'abnormal' ? 'text-accent' : 'text-ink'}`}>
                  {cvPred.prediction === 'abnormal' ? 'Abnormal' : 'Normal'}
                </div>
                <div className="eyebrow text-meta !text-[10px] mt-3">Confidence</div>
                <div className="text-2xl metric-value mt-1">
                  {(cvPred.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ) : <div className="meta py-8">Running inference…</div>}
        </FeatureSection>

        <FeatureSection
          index="05"
          eyebrow="OLAP · ROLLUP · DRILL · SLICE · DICE · PIVOT"
          title="A cube that answers back."
          blurb="A real multidimensional engine over the star schema. Rotate the model, change a metric, and the graphs follow the query."
          href="/olap"
          cta="Open the OLAP workspace →"
          columns={8}
        >
          <OlapPreview />
        </FeatureSection>

        <FeatureSection
          index="06"
          eyebrow="DNA EDITING LAB"
          title="One base, many consequences."
          blurb="A supported edit propagates to the mutation catalog, warehouse observations and compatible aggregates."
          href="/alpha"
          cta="Enter the laboratory →"
          columns={4}
        >
          <HelixGlyph />
        </FeatureSection>

        <FeatureSection
          index="07"
          eyebrow="DATA MINING"
          title="Clusters, rules, outliers."
          blurb="K-Means and DBSCAN partitions over the sample dimension; Apriori rules over the clinical layer; Isolation-Forest anomaly scoring."
          href="/ai-lab"
          cta="Open the mining lab →"
          columns={6}
        >
          <MiningGlyph />
        </FeatureSection>

        <FeatureSection
          index="08"
          eyebrow="WAREHOUSE"
          title="Star schema, in black."
          blurb="A visible dimensional model: fact table, dimensions, and the measurable quantities that connect them."
          href="/warehouse"
          cta="Inspect the schema →"
          columns={6}
        >
          <SchemaGlyph />
        </FeatureSection>
      </div>

      <div className="rule-h-thick mt-10 mb-6" />

      <div className="grid grid-cols-12 gap-5 pb-4">
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow mb-2">The chain, in brief</div>
          <h3 className="font-display font-bold text-ink text-2xl md:text-3xl leading-tight">
            DNA → Gene → RNA → Protein → Cell → Phenotype.
          </h3>
          <p className="font-prose text-prose text-[15px] mt-3 leading-snug max-w-3xl">
            Every panel on this issue traces back to one of the links in the
            central dogma. Sources: <em>Ensembl</em>, <em>UniProt</em>,
            <em> ClinVar/COSMIC</em>, <em>GTEx / TCGA-BRCA</em>,
            <em> UCI WDBC · Kaggle</em>, <em>MedMNIST</em>.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4 lg:border-l lg:border-ink lg:pl-6">
          <div className="eyebrow mb-2">Jump to</div>
          <ul className="font-sans text-sm space-y-1">
            <li><Link className="hover:underline" href="/olap">OLAP Workspace →</Link></li>
            <li><Link className="hover:underline" href="/alpha">DNA Editor →</Link></li>
            <li><Link className="hover:underline" href="/warehouse">Warehouse Schema →</Link></li>
            <li><Link className="hover:underline" href="/demo">Live Demo Script →</Link></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ========= Decorative glyphs (pure SVG, no fake data) ========= */
function OlapPreview() {
  return (
    <div className="relative h-56 bg-subtle border border-ink flex items-center justify-center overflow-hidden">
      <svg viewBox="-60 -60 120 120" className="w-56 h-56">
        <g transform="rotate(-18)">
          {Array.from({length: 3}).map((_,i)=>
            Array.from({length: 3}).map((_,j)=>
              Array.from({length: 3}).map((_,k)=>{
                const x = (i-1)*18 + (j-1)*6;
                const y = (k-1)*18 - (j-1)*5;
                const sel = i===1 && j===1 && k===1;
                return (
                  <rect key={`${i}${j}${k}`}
                    x={x-7} y={y-7} width="14" height="14"
                    fill={sel ? '#CC0000' : '#FFFFFF'}
                    stroke="#111111" strokeWidth="1"/>
                );
              })
            )
          )}
        </g>
      </svg>
      <div className="absolute bottom-2 left-2 meta text-[9px]">
        X · TIME &nbsp; Y · GENE &nbsp; Z · DISEASE
      </div>
      <div className="absolute top-2 right-2 badge">PREVIEW</div>
    </div>
  );
}

function HelixGlyph() {
  const bases = Array.from({length: 14});
  return (
    <div className="h-56 flex items-center justify-center bg-subtle border border-ink">
      <svg viewBox="0 0 200 220" className="h-full">
        {bases.map((_,i) => {
          const t = (i / (bases.length-1)) * Math.PI * 2.4;
          const y = 15 + i * 14;
          const x1 = 100 + Math.cos(t) * 40;
          const x2 = 100 - Math.cos(t) * 40;
          const isAccent = i === 7;
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2} y2={y}
                stroke={isAccent ? '#CC0000' : '#111111'}
                strokeWidth={isAccent ? 2.5 : 1}/>
              <circle cx={x1} cy={y} r="3" fill={isAccent ? '#CC0000' : '#111111'}/>
              <circle cx={x2} cy={y} r="3" fill={isAccent ? '#CC0000' : '#111111'}/>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiningGlyph() {
  const pts = Array.from({length: 60}).map((_,i) => ({
    x: 20 + (i*17 % 360),
    y: 20 + ((i*29 + 11) % 160),
    c: i % 3,
  }));
  const colors = ['#111111','#1F4E79','#CC0000'];
  return (
    <div className="h-56 bg-subtle border border-ink p-2">
      <svg viewBox="0 0 400 200" className="w-full h-full">
        <rect x="0.5" y="0.5" width="399" height="199" fill="none" stroke="#11111120"/>
        {pts.map((p,i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.c===2?4:2.5}
                  fill={colors[p.c]} stroke="#111" strokeWidth={p.c===2?1:0}/>
        ))}
      </svg>
    </div>
  );
}

function SchemaGlyph() {
  const dims = ['SAMPLE','GENE','RNA','PROTEIN','MUTATION','DISEASE','IMAGE','TIME'];
  return (
    <div className="h-56 bg-subtle border border-ink relative overflow-hidden">
      <svg viewBox="0 0 400 220" className="w-full h-full">
        {dims.map((d, i) => {
          const angle = (i / dims.length) * Math.PI * 2;
          const x = 200 + Math.cos(angle) * 130;
          const y = 110 + Math.sin(angle) * 80;
          return (
            <g key={d}>
              <line x1="200" y1="110" x2={x} y2={y} stroke="#111" strokeWidth="1"/>
              <rect x={x-28} y={y-10} width="56" height="20" fill="#FFFFFF" stroke="#111"/>
              <text x={x} y={y+4} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono" fill="#111">{d}</text>
            </g>
          );
        })}
        <rect x="170" y="92" width="60" height="36" fill="#CC0000" stroke="#111"/>
        <text x="200" y="114" textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono" fill="#FFF" fontWeight="700">FACT</text>
      </svg>
    </div>
  );
}
