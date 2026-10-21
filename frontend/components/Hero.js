'use client';
import Link from 'next/link';

/**
 * Editorial hero — the "front page" of BioVision.
 * Oversized Playfair headline, Lora sub-lede, two actions, and a small
 * byline strip beneath it, in the spirit of a scientific journal cover.
 */
export function Hero({ totals = {} }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <section className="mb-10">
      <div className="editorial-strip">
        <span>BIOVISION · THE DAILY OMICS</span>
        <span className="hidden md:inline font-mono tracking-[0.14em] text-meta">
          {today.toUpperCase()}
        </span>
        <span className="hidden md:inline">VOL. 01 · ISSUE 04</span>
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-10 pt-8">
        {/* Headline block — 8 cols */}
        <div className="col-span-12 lg:col-span-8">
          <div className="eyebrow mb-5 text-prose">
            — MULTI-OMICS INTELLIGENCE PLATFORM
          </div>
          <h1 className="font-display font-bold text-ink text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.25rem] leading-[0.98] tracking-[-0.02em]">
            Biology,<br/>
            <span className="italic font-normal">seen through</span> data.
          </h1>
          <p className="lede mt-6 max-w-2xl">
            A dimensional warehouse of genomics, transcriptomics, proteomics,
            mutation evidence and biomedical imagery &mdash; wired to an
            interactive OLAP cube, a variant laboratory and explainable models.
            Every column is traceable to its source.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link href="/warehouse" className="btn">
              Explore the Warehouse <span aria-hidden>→</span>
            </Link>
            <Link href="/olap" className="btn btn-ghost">
              Open the OLAP Lab <span aria-hidden>↗</span>
            </Link>
            <Link href="/alpha" className="meta underline-offset-4 hover:underline">
              DNA Editor →
            </Link>
          </div>
        </div>

        {/* Byline / meta — 4 cols */}
        <aside className="col-span-12 lg:col-span-4 lg:border-l lg:border-ink lg:pl-6">
          <div className="eyebrow mb-3">In this issue</div>
          <ul className="font-prose text-[15px] text-ink space-y-2 leading-snug">
            <li>· The star schema that reads like a periodical.</li>
            <li>· A rotating cube for roll-up, drill, slice &amp; dice.</li>
            <li>· An AlphaGenome-inspired DNA editing bench.</li>
            <li>· Grad-CAM over medical imagery.</li>
          </ul>
          <div className="rule-h my-4" />
          <div className="eyebrow mb-2 text-prose">Snapshot</div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">
            <HeroStat value={totals.genes}       label="Genes" />
            <HeroStat value={totals.mutations}   label="Mutations" />
            <HeroStat value={totals.rna_samples} label="RNA" />
            <HeroStat value={totals.proteins}    label="Proteins" />
          </dl>
        </aside>
      </div>

      <div className="rule-h-thick mt-10" />
    </section>
  );
}

function HeroStat({ value, label }) {
  return (
    <div>
      <div className="text-xl font-bold text-ink metric-value">{value ?? '—'}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-meta mt-0.5">{label}</div>
    </div>
  );
}
