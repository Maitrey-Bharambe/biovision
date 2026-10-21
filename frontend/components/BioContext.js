'use client';
/**
 * Cross-page selection context for BioVision.
 *
 * Preserves gene / disease / chromosome / sample / mutation across routes
 * via sessionStorage + a visible breadcrumb.  Pages opt in by reading
 * ctx.gene (etc.) and calling ctx.setContext({ gene }) when the user
 * selects something.  The breadcrumb appears in <AppShell>.
 *
 * Deliberately simple: no reducer indirection, no hidden mutations.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'biovision.ctx';
const EMPTY = { gene: null, disease: null, chromosome: null, sample: null, mutation: null };

const Ctx = createContext({
  ...EMPTY,
  setContext: () => {},
  clear:       () => {},
  active:     [],
});

export function BioContextProvider({ children }) {
  const [state, setState] = useState(EMPTY);

  // Hydrate from sessionStorage after first mount (SSR-safe).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((patch) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setState(EMPTY);
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  const active = useMemo(
    () => Object.entries(state).filter(([_, v]) => v != null && v !== ''),
    [state],
  );

  const value = useMemo(
    () => ({ ...state, setContext: persist, clear, active }),
    [state, persist, clear, active],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBioContext() {
  return useContext(Ctx);
}

/** Rendered on every page below the back button. */
export function ContextBreadcrumb() {
  const { active, clear } = useBioContext();
  if (!active.length) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap mb-5 border-y border-ink py-2 bg-subtle px-3">
      <span className="eyebrow text-meta !text-[10px]">Context</span>
      {active.map(([k, v]) => (
        <span key={k} className="font-mono text-[11px] tabular-nums bg-white border border-ink px-2 py-0.5">
          <span className="text-meta uppercase">{k}</span>
          <span className="mx-1 text-ink">/</span>
          <span className="text-accent font-semibold">{String(v)}</span>
        </span>
      ))}
      <button onClick={clear}
              className="ml-auto meta !text-[10px] uppercase tracking-[0.18em] hover:text-ink underline-offset-4 hover:underline">
        Clear all
      </button>
    </div>
  );
}
