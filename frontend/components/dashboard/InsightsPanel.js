'use client';
import Link from 'next/link';

const ICONS = {
  correlation: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9.5 9.5l5 5" strokeLinecap="round"/></svg>,
  hotspot:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3s6 6 6 11a6 6 0 01-12 0c0-5 6-11 6-11z"/></svg>,
  cluster:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" opacity="0.5"/></svg>,
  anomaly:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 4v6M12 16v4M4 12h6M14 12h6" strokeLinecap="round"/></svg>,
  survival:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20V6M4 20l6-6 4 4 6-8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

export function InsightsPanel({ items = [] }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <Link key={i} href={it.href || '#'}
          className="flex items-start gap-3 px-4 py-3 border border-ink bg-white hover:bg-subtle transition group">
          <div className="w-9 h-9 shrink-0 bg-ink text-paper flex items-center justify-center">
            {ICONS[it.icon] || ICONS.correlation}
          </div>
          <div className="flex-1 min-w-0">
            <div className="eyebrow !text-[10px] text-ink">{it.title}</div>
            <div className="text-sm font-prose text-prose mt-1 leading-snug">{it.body}</div>
          </div>
          <div className="text-meta group-hover:text-accent text-lg font-sans">›</div>
        </Link>
      ))}
    </div>
  );
}
