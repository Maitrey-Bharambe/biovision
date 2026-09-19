'use client';
import Link from 'next/link';

/**
 * Overview hero — copy-forward layout.
 * The full-viewport biotech backdrop (DNA + protein + cells) is applied to
 * the <body> in globals.css, so this section stays intentionally minimal:
 * bold display headline, description, primary + secondary CTAs, and a
 * compact stat strip. No competing right-side illustration.
 */
export function Hero({ totals = {} }) {
  return (
    <section className="relative overflow-hidden rounded-4xl bg-white/50 backdrop-blur-xl border border-white/70 shadow-cardhi px-6 md:px-12 py-10 md:py-14 mb-10">
      <div className="max-w-3xl">
        <div className="text-teal text-xs font-semibold tracking-[0.28em] mb-4">
          — MULTI-OMICS INTELLIGENCE PLATFORM
        </div>
        <h1 className="font-display font-bold text-4xl md:text-6xl text-ink leading-[1.02] tracking-tight">
          Decode Biology<br/>
          Discover Possibilities
        </h1>
        <p className="text-base md:text-lg text-ink2/80 mt-6 max-w-2xl leading-relaxed">
          Integrating <span className="text-teal font-medium">genomics</span>,
          {' '}<span className="text-teal font-medium">transcriptomics</span>, proteomics
          and biological imaging with AI to unlock deeper insights into life.
        </p>

        <div className="flex flex-wrap gap-3 mt-8 items-center">
          <Link href="/genome" className="btn !py-3.5 !px-6">
            Explore the Genome
            <span>→</span>
          </Link>
          <Link href="/demo" className="flex items-center gap-3 group">
            <span className="w-12 h-12 rounded-full bg-white border border-border shadow-card flex items-center justify-center text-ink group-hover:shadow-cardhi transition">
              <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><path d="M0 0 L12 7 L0 14 Z"/></svg>
            </span>
            <span>
              <div className="text-sm font-semibold text-ink">Watch Demo</div>
              <div className="text-xs text-muted">2 min</div>
            </span>
          </Link>
        </div>

        {/* mini stat strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-10 max-w-2xl">
          <MiniStat icon={<IconHelix />}    value={totals.genes}       label="Genes" />
          <MiniStat icon={<IconMutation />} value={totals.mutations}   label="Mutations" />
          <MiniStat icon={<IconRna />}      value={totals.rna_samples} label="RNA Samples" />
          <MiniStat icon={<IconProtein />}  value={totals.proteins}    label="Proteins" />
        </div>
      </div>
    </section>
  );
}

function MiniStat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white shadow-card flex items-center justify-center text-teal">
        {icon}
      </div>
      <div>
        <div className="text-lg font-display font-bold text-ink leading-none">{value ?? '—'}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/* ---------------------- icons -------------------------------- */
function IconHelix() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M6 4c4 4 8 4 12 0M6 20c4-4 8-4 12 0M6 4v16M18 4v16" strokeLinecap="round"/>
  </svg>;
}
function IconMutation() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="8"/>
    <path d="M12 6v6l4 2" strokeLinecap="round"/>
  </svg>;
}
function IconRna() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 20L12 4l8 16M8 14h8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function IconProtein() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="8"  cy="8"  r="3"/>
    <circle cx="16" cy="10" r="3"/>
    <circle cx="12" cy="17" r="3"/>
    <path d="M10 10l3 3M14 12l0 3" strokeLinecap="round"/>
  </svg>;
}
