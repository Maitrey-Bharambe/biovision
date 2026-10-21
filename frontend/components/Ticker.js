'use client';
/**
 * Horizontal black ticker printing live warehouse metrics.  Values marked
 * null render an "unavailable" state (an em-dash) rather than a fake number.
 * Respects prefers-reduced-motion through globals.css.
 */
export function Ticker({ items = [] }) {
  const row = items.map((it, i) => (
    <span key={i} className="inline-flex items-center gap-3 px-6 whitespace-nowrap">
      <span className="w-1.5 h-1.5 bg-accent" aria-hidden />
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#9A9A9A]">
        {it.label}
      </span>
      <span className="font-mono text-sm text-white font-semibold">
        {it.value == null || it.value === undefined ? '—' : it.value}
      </span>
      <span className="text-[#555]" aria-hidden>·</span>
    </span>
  ));
  return (
    <div
      className="w-full bg-ink text-white border-y border-ink overflow-hidden"
      role="region"
      aria-label="Live warehouse statistics"
    >
      <div className="ticker-track py-2.5" aria-hidden>
        {row}{row}
      </div>
      {/* Accessible static alternative */}
      <div className="sr-only">
        {items.map((it) => `${it.label}: ${it.value ?? 'unavailable'}`).join('. ')}
      </div>
    </div>
  );
}
