'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Card, MetricCard } from '../components/Card';

export default function Overview() {
  const [data, setData]   = useState(null);
  const [status, setStat] = useState('loading'); // loading | ok | error

  useEffect(() => {
    api.overview().then((d) => {
      if (!d) { setStat('error'); return; }
      setData(d); setStat('ok');
    });
  }, []);

  const totals = data?.totals || {};

  return (
    <div>
      {/* ===== Hero (compact) ===== */}
      <section className="relative overflow-hidden rounded-[20px] border border-border bg-surface p-5 md:p-6 mb-6">
        <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full bg-accent/12 blur-3xl pointer-events-none" aria-hidden/>
        <div className="relative grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-8">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-accent2 bg-accentTint px-2.5 py-1 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent blink-dot"/>
              BioVision Intelligence · v1.1
            </div>
            <h1 className="font-sans font-semibold text-ink text-[1.65rem] md:text-[2rem] leading-[1.1] tracking-tight">
              From biological data to <span className="text-accent">discoverable insights.</span>
            </h1>
            <p className="text-[13.5px] md:text-[14px] text-muted mt-2 max-w-2xl leading-relaxed">
              Explore multi-omics data, investigate biological relationships, and understand
              machine-learning outputs through one evidence-driven workspace.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <Link href="/nexus" className="btn !py-2 !px-4 !text-[13px]">
                Start an Investigation
              </Link>
              <Link href="/warehouse" className="btn btn-ghost !py-2 !px-4 !text-[13px]">
                Explore the Warehouse
              </Link>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 flex justify-end">
            <HeroGlyph />
          </div>
        </div>
      </section>

      {/* ===== Warehouse metrics ===== */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-xl text-ink">Warehouse at a glance</h2>
          <Link href="/warehouse" className="meta !normal-case !tracking-normal hover:text-ink">
            inspect schema →
          </Link>
        </div>
        {status === 'error' ? (
          <Card className="!py-5">
            <div className="flex items-center gap-3 text-bad">
              <span className="w-2 h-2 rounded-full bg-bad"/>
              <span className="text-[13px]">Backend unavailable — showing structural placeholders only.</span>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Genes"       value={status === 'loading' ? '…' : totals.genes}       color="genomics"/>
            <MetricCard label="Mutations"   value={status === 'loading' ? '…' : totals.mutations}   color="accent"/>
            <MetricCard label="RNA samples" value={status === 'loading' ? '…' : totals.rna_samples} color="transcript"/>
            <MetricCard label="Proteins"    value={status === 'loading' ? '…' : totals.proteins}    color="proteomics"/>
            <MetricCard label="Images"      value={status === 'loading' ? '…' : totals.images}      color="imaging"/>
            <MetricCard label="Samples"     value={status === 'loading' ? '…' : totals.samples}     color="accent"/>
          </div>
        )}
      </section>

      {/* ===== Module cards ===== */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-xl text-ink">Modules</h2>
          <span className="meta">five entry points · one investigation</span>
        </div>
        <div className="grid grid-cols-12 gap-4">
          <ModuleCard
            className="col-span-12 md:col-span-6 lg:col-span-5"
            tint="genomics"
            eyebrow="Multi-omics explorer"
            title="Explore the DNA → RNA → Protein chain."
            blurb="Query the warehouse by gene, chromosome, tissue, condition. Every record carries provenance back to its curated source."
            cta="Open genome →"
            href="/genome"
            glyph={<GlyphHelix/>}
          />
          <ModuleCard
            className="col-span-12 md:col-span-6 lg:col-span-7"
            tint="accent"
            eyebrow="Live 3D OLAP cube"
            title="Rotate the warehouse, see the SQL."
            blurb="Real roll-up, drill-down, slice, dice and pivot operations. The cube and the query view update together; the SQL is visible, not hidden."
            cta="Open the cube →"
            href="/olap"
            glyph={<GlyphCube/>}
          />
          <ModuleCard
            className="col-span-12 md:col-span-6 lg:col-span-5"
            tint="imaging"
            eyebrow="Vision & explainability"
            title="See what the model is looking at."
            blurb="A convolutional network over BreastMNIST patches, paired with a real Grad-CAM overlay. Correctness is measured against ground-truth labels."
            cta="Open vision →"
            href="/biovision"
            glyph={<GlyphVision/>}
          />
          <ModuleCard
            className="col-span-12 md:col-span-6 lg:col-span-7"
            tint="proteomics"
            eyebrow="Data mining studio"
            title="Classification, clustering, rules, outliers."
            blurb="Classical mining modules trained on the real feature table: Random Forest, K-Means, DBSCAN, Apriori and Isolation Forest, with their metrics on display."
            cta="Open data mining →"
            href="/ai-lab"
            glyph={<GlyphMining/>}
          />
          <ModuleCard
            className="col-span-12 md:col-span-6 lg:col-span-6"
            tint="transcript"
            eyebrow="DNA editing bench"
            title="One base, many consequences."
            blurb="Substitute a single nucleotide of a real gene, inspect the codon translation and the computed consequence, and watch the warehouse look for a matching record."
            cta="Open DNA bench →"
            href="/alpha"
            glyph={<GlyphDNA/>}
          />
          <ModuleCard
            className="col-span-12 md:col-span-6 lg:col-span-6"
            tint="accent"
            eyebrow="BioVision Nexus"
            title="Investigate in natural language."
            blurb="Describe what you want to find out. BioVision plans an answer using the warehouse and the trained models, keeps every number traceable, and asks a language model only to explain — never to invent."
            cta="Open Nexus →"
            href="/nexus"
            badge="NEW"
            glyph={<GlyphNexus/>}
          />
        </div>
      </section>

      {/* ===== What you can ask ===== */}
      <section className="mb-10">
        <Card title="What you can ask BioVision"
              subtitle="These are examples; every answer resolves against the real backend.">
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { tag: 'SQL',       t: 'Show the distribution of mutation types in the current dataset.' },
              { tag: 'SQL',       t: 'Compare TP53 expression across tissues for healthy vs cancer samples.' },
              { tag: 'ML',        t: 'Explain the output of the current K-Means clustering.' },
              { tag: 'ML',        t: 'What is the model looking at in this ultrasound patch?' },
              { tag: 'META',      t: 'List the data sources behind the gene table.' },
              { tag: 'META',      t: 'Which dimensions can roll up on the gene hierarchy?' },
            ].map((q, i) => (
              <Link key={i} href={`/nexus?q=${encodeURIComponent(q.t)}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-accent hover:bg-accentTint/50 transition">
                <span className="pill pill-accent !py-0.5 !px-2 !text-[9.5px] !tracking-widest shrink-0 mt-0.5">{q.tag}</span>
                <span className="text-[13.5px] text-ink leading-snug">{q.t}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ===== Module card ===== */
function ModuleCard({ className, tint, eyebrow, title, blurb, cta, href, glyph, badge }) {
  const stripe = {
    accent:     'bg-accent',
    genomics:   'bg-genomics',
    transcript: 'bg-transcript',
    proteomics: 'bg-proteomics',
    imaging:    'bg-imaging',
  }[tint] || 'bg-accent';
  const tintBg = {
    accent:     'bg-accentTint',
    genomics:   'bg-[#FCEBF4]',
    transcript: 'bg-[#FCF6D8]',
    proteomics: 'bg-[#E8F0E1]',
    imaging:    'bg-[#E3EDFA]',
  }[tint] || 'bg-accentTint';
  return (
    <Link href={href}
          className={`${className} group block relative overflow-hidden rounded-[22px] border border-border bg-surface p-6 hover:-translate-y-0.5 hover:shadow-cardhi transition`}>
      <div className={`absolute top-0 left-0 h-1 w-full ${stripe}`} aria-hidden/>
      <div className="flex items-start justify-between gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-medium text-muted">{eyebrow}</span>
            {badge && (
              <span className="text-[9px] font-semibold tracking-wider text-accent bg-accentTint px-1.5 py-0.5 rounded">
                {badge}
              </span>
            )}
          </div>
          <h3 className="font-sans font-semibold text-ink text-[1.1rem] leading-snug tracking-tight">
            {title}
          </h3>
          <p className="text-[13px] text-muted mt-1.5 leading-snug">{blurb}</p>
          <div className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent group-hover:text-accent2">
            {cta}
          </div>
        </div>
        <div className={`shrink-0 w-20 h-20 ${tintBg} rounded-xl flex items-center justify-center`}>
          {glyph}
        </div>
      </div>
    </Link>
  );
}

/* ===== Decorative glyphs (pure SVG) ===== */
function HeroGlyph() {
  return (
    <svg viewBox="0 0 300 300" className="w-44 h-44 md:w-52 md:h-52">
      <defs>
        <radialGradient id="hg" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#EFEAFC"/>
          <stop offset="100%" stopColor="#C8B9F7"/>
        </radialGradient>
      </defs>
      <circle cx="150" cy="150" r="110" fill="url(#hg)" stroke="#7656E8" strokeWidth="1" opacity="0.55"/>
      <circle cx="150" cy="150" r="78"  fill="#FFFEFA" stroke="#7656E8" strokeWidth="1" opacity="0.6"/>
      <circle cx="150" cy="150" r="46"  fill="#7656E8"/>
      {/* orbit nodes */}
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const r = 110, rad = (a * Math.PI) / 180;
        const cx = 150 + Math.cos(rad) * r;
        const cy = 150 + Math.sin(rad) * r;
        const colors = ['#F0B4D5','#F4D96B','#A9C59A','#AFC8F0','#F0B4D5','#A9C59A'];
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="12" fill={colors[i]} stroke="#171717" strokeOpacity="0.1"/>
          </g>
        );
      })}
      <text x="150" y="156" textAnchor="middle" fill="#FFFEFA" fontSize="18"
            fontFamily="Fraunces, serif" fontWeight="600">BIO</text>
    </svg>
  );
}

function GlyphHelix() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      {Array.from({length: 7}).map((_, i) => {
        const t = (i / 6) * Math.PI * 1.8;
        const y = 10 + i * 10;
        const x1 = 40 + Math.cos(t) * 20;
        const x2 = 40 - Math.cos(t) * 20;
        return (
          <g key={i}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke="#8D3B6A" strokeWidth="1.2"/>
            <circle cx={x1} cy={y} r="3" fill="#F0B4D5" stroke="#8D3B6A" strokeWidth="1"/>
            <circle cx={x2} cy={y} r="3" fill="#F0B4D5" stroke="#8D3B6A" strokeWidth="1"/>
          </g>
        );
      })}
    </svg>
  );
}
function GlyphCube() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      {[0,1,2].flatMap((i) => [0,1,2].map((j) => (
        <rect key={`${i}${j}`} x={10 + i*18 + j*5} y={30 + j*5 - i*2}
              width="16" height="16" fill="#FFFEFA" stroke="#5E3FD6" strokeWidth="1"/>
      )))}
      <rect x="28" y="30" width="16" height="16" fill="#7656E8" stroke="#5E3FD6" strokeWidth="1"/>
    </svg>
  );
}
function GlyphVision() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <rect x="12" y="18" width="56" height="44" rx="4" fill="#FFFEFA" stroke="#3E578A" strokeWidth="1.2"/>
      <circle cx="40" cy="40" r="12" fill="#AFC8F0" stroke="#3E578A"/>
      <circle cx="40" cy="40" r="5"  fill="#3E578A"/>
      <path d="M14 26l10 6M66 26l-10 6M14 56l10-6M66 56l-10-6" stroke="#3E578A" strokeWidth="0.8"/>
    </svg>
  );
}
function GlyphMining() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      {Array.from({length: 18}).map((_, i) => {
        const x = 12 + (i * 11) % 60;
        const y = 14 + ((i * 7) % 52);
        const c = i % 3 === 0 ? '#7656E8' : i % 3 === 1 ? '#A9C59A' : '#4B6B3F';
        return <circle key={i} cx={x} cy={y} r="3" fill={c}/>;
      })}
    </svg>
  );
}
function GlyphDNA() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <text x="12" y="30" fontFamily="JetBrains Mono" fontSize="14" fill="#866900" fontWeight="700">A</text>
      <text x="28" y="30" fontFamily="JetBrains Mono" fontSize="14" fill="#8D3B6A" fontWeight="700">C</text>
      <text x="44" y="30" fontFamily="JetBrains Mono" fontSize="14" fill="#4B6B3F" fontWeight="700">G</text>
      <text x="60" y="30" fontFamily="JetBrains Mono" fontSize="14" fill="#B88520" fontWeight="700">T</text>
      <rect x="28" y="42" width="16" height="20" fill="#7656E8"/>
      <text x="36" y="58" fontFamily="JetBrains Mono" fontSize="12" fill="#fff" textAnchor="middle" fontWeight="700">C</text>
    </svg>
  );
}
function GlyphNexus() {
  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx="40" cy="40" r="8" fill="#7656E8"/>
      {[0,1,2,3,4].map((i) => {
        const a = (i / 5) * 2 * Math.PI - Math.PI/2;
        const x = 40 + Math.cos(a) * 26;
        const y = 40 + Math.sin(a) * 26;
        return (
          <g key={i}>
            <line x1={40} y1={40} x2={x} y2={y} stroke="#7656E8" strokeWidth="1" opacity="0.5"/>
            <circle cx={x} cy={y} r="4" fill="#F0B4D5" stroke="#7656E8"/>
          </g>
        );
      })}
    </svg>
  );
}
