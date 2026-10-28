'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { useBioContext } from './BioContext';

/* ------------------------------------------------------------
 * Map a route path -> (title, group).  Keep in sync with the
 * sidebar; the header mirrors the sidebar's language.
 * ---------------------------------------------------------- */
const TITLES = {
  '/':          ['Overview',              'Workspace'],
  '/nexus':     ['BioVision Nexus',       'Workspace'],
  '/saved':     ['Saved Investigations',  'Workspace'],
  '/genome':    ['Genome Explorer',       'Biological Data'],
  '/rna':       ['Transcriptome',         'Biological Data'],
  '/protein':   ['Proteomics',            'Biological Data'],
  '/mutation':  ['Mutations',             'Biological Data'],
  '/olap':      ['3D OLAP Cube',          'Analytics'],
  '/ai-lab':    ['Data Mining Studio',    'Analytics'],
  '/biovision': ['Vision & Explainability','Analytics'],
  '/alpha':     ['DNA Editing Bench',     'Research Tools'],
  '/sources':   ['Data Sources',          'System'],
  '/warehouse': ['Warehouse Health',      'System'],
  '/demo':      ['Live Demo',             'System'],
  '/sample':    ['Sample Browser',        'Biological Data'],
};

function matchRoute(pathname) {
  if (!pathname) return TITLES['/'];
  if (TITLES[pathname]) return TITLES[pathname];
  // longest-prefix match for nested routes (/sample/123, etc.)
  const prefix = Object.keys(TITLES).sort((a,b) => b.length - a.length).find(
    (p) => p !== '/' && pathname.startsWith(p));
  return prefix ? TITLES[prefix] : TITLES['/'];
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [title, group] = matchRoute(pathname);
  const ctx = useBioContext();
  const activeContext = (ctx.active || []).slice(0, 3);

  return (
    <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur border-b border-border -mx-6 md:-mx-10 px-6 md:px-10 py-3 mb-5">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Title + breadcrumb */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-muted mb-0.5">
            <span>{group}</span>
            <span className="text-border">/</span>
            <span className="text-ink/70 font-medium">{title}</span>
          </div>
          <h1 className="font-sans font-semibold text-ink text-[18px] md:text-[20px] leading-tight tracking-tight truncate">
            {title}
          </h1>
        </div>

        {/* Global search */}
        <GlobalSearch onNavigate={(href) => router.push(href)} />

        {/* Context chip */}
        {activeContext.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 pill pill-accent !py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"/>
            <span className="font-mono text-[11px]">
              {activeContext.map(([k, v]) => `${k}=${v}`).join(' · ')}
            </span>
            <button onClick={ctx.clear}
                    className="ml-1 text-accent2 hover:text-ink text-[10px] font-semibold uppercase tracking-widest">
              reset
            </button>
          </div>
        )}

        {/* Start Investigation CTA (hidden on Nexus itself) */}
        {!pathname?.startsWith('/nexus') && (
          <Link href="/nexus"
                className="btn !py-2 !px-3.5 !text-[12px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Start Investigation
          </Link>
        )}
      </div>
    </header>
  );
}

/* -----------------------------------------------------------
 * Global search — queries /genes, /proteins, /mutations for a
 * substring match and ranks the hits.  Debounced; shows real
 * empty / error / loading states.
 * ---------------------------------------------------------- */
function GlobalSearch({ onNavigate }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ok
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setResults(null); setStatus('idle'); return; }
    setStatus('loading');
    abortRef.current?.abort?.();
    const h = setTimeout(async () => {
      try {
        const [genes, proteins, mutations] = await Promise.all([
          api.genes(),
          api.proteins(),
          api.mutations('limit=200'),
        ]);
        const needle = q.trim().toLowerCase();
        const g = (genes || []).filter(x => (x.gene_name || '').toLowerCase().includes(needle))
                               .slice(0, 5)
                               .map(x => ({ type: 'gene',    label: x.gene_name,
                                           href: `/genome#gene=${encodeURIComponent(x.gene_name)}`,
                                           meta: x.biotype || '' }));
        const p = (proteins || []).filter(x => (x.protein_name || '').toLowerCase().includes(needle) ||
                                               (x.gene || '').toLowerCase().includes(needle))
                                   .slice(0, 5)
                                   .map(x => ({ type: 'protein', label: x.protein_name,
                                               href: `/protein`,
                                               meta: x.gene || '' }));
        const m = (mutations || []).filter(x => (x.gene || '').toLowerCase().includes(needle) ||
                                                (x.protein_change || '').toLowerCase().includes(needle))
                                    .slice(0, 5)
                                    .map(x => ({ type: 'mutation', label: `${x.gene} ${x.protein_change}`,
                                                href: `/mutation?gene=${encodeURIComponent(x.gene)}`,
                                                meta: x.consequence || x.type }));
        setResults([...g, ...p, ...m]);
        setStatus('ok');
      } catch (e) {
        setStatus('error');
      }
    }, 220);
    return () => clearTimeout(h);
  }, [q]);

  const typeColor = {
    gene:     'pill-genomics',
    protein:  'pill-proteomics',
    mutation: 'pill-accent',
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-sm">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
           width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4" strokeLinecap="round"/>
      </svg>
      <input
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        placeholder="Search genes, proteins, mutations…"
        className="w-full !pl-9 !pr-3 !py-2 !text-sm"
      />
      {open && (status !== 'idle') && (
        <div className="absolute left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-cardhi overflow-hidden">
          {status === 'loading' && (
            <div className="meta !normal-case p-3 !tracking-normal">Searching…</div>
          )}
          {status === 'error' && (
            <div className="p-3 text-[13px] text-bad">Search unavailable (backend offline).</div>
          )}
          {status === 'ok' && results.length === 0 && (
            <div className="p-3 text-[13px] text-muted">No matches for “{q}”.</div>
          )}
          {status === 'ok' && results.length > 0 && (
            <ul className="max-h-72 overflow-auto">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => { onNavigate(r.href); setOpen(false); setQ(''); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-canvas transition">
                    <span className={`${typeColor[r.type]} pill !py-0.5 !px-1.5 !text-[9px] !tracking-widest`}>{r.type}</span>
                    <span className="font-sans text-[13px] text-ink flex-1 truncate">{r.label}</span>
                    <span className="meta !tracking-normal normal-case truncate max-w-[40%]">{r.meta}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
