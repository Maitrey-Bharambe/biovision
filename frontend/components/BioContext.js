'use client';
/**
 * Investigation context — a single session-scoped selection shared
 * across modules.  Pages opt in by calling ctx.setContext({...}) when
 * the user picks something, and by reading ctx.gene / ctx.disease etc.
 * when they mount.
 *
 * Fields: gene · disease · chromosome · sample · mutation
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const KEY   = 'biovision.ctx';
const EMPTY = { gene: null, disease: null, chromosome: null, sample: null, mutation: null };

const Ctx = createContext({
  ...EMPTY,
  setContext: () => {},
  clear:      () => {},
  active:     [],
});

export function BioContextProvider({ children }) {
  const [state, setState] = useState(EMPTY);

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

/** The compact header-level context chip (optional component). */
export function ContextBreadcrumb() {
  const { active, clear } = useBioContext();
  if (!active.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="meta !text-[10px]">context</span>
      {active.map(([k, v]) => (
        <span key={k} className="pill pill-accent !py-0.5 !px-2 !text-[10.5px]">
          <span className="opacity-70 mr-1">{k}</span>
          <span>{String(v)}</span>
        </span>
      ))}
      <button onClick={clear}
              className="meta !text-[10px] hover:text-ink underline-offset-4 hover:underline">
        clear all
      </button>
    </div>
  );
}
