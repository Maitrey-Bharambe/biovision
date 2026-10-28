'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';

/* Session-scoped investigation history.  We intentionally do not pretend
   to persist across tabs — there is no authenticated storage layer in
   the current backend.  Users save a Nexus run manually. */
const KEY = 'biovision.saved';

export default function SavedPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch { setItems([]); }
  }, []);

  const removeOne = (ts) => {
    const next = items.filter((x) => x.ts !== ts);
    setItems(next);
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <div>
      <PageHeader
        eyebrow="SAVED"
        title="Saved investigations"
        description="Investigations you pinned from the Nexus workspace. Stored in this browser session only — this prototype does not persist across tabs or devices."
      />
      {items.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <div className="font-display font-semibold text-xl text-ink">Nothing saved yet.</div>
            <div className="lede mt-1 text-[14px] max-w-md mx-auto">
              Open a Nexus investigation and press <span className="font-mono text-accent">Pin</span>.
            </div>
            <Link href="/nexus" className="btn mt-5">Open Nexus →</Link>
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.ts}>
              <Card>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-sans font-semibold text-ink">{it.question}</div>
                    <div className="meta mt-1 !text-[10px]">
                      {new Date(it.ts).toLocaleString()}
                      {' · '}{it.results?.length ?? 0} step(s)
                      {' · '}{it.explanation?.source || 'no explanation'}
                    </div>
                  </div>
                  <button onClick={() => removeOne(it.ts)}
                          className="btn-ghost btn !py-1.5 !px-3 !text-[11px]">Remove</button>
                </div>
                {it.explanation?.text && (
                  <p className="text-[13.5px] text-ink mt-3 leading-relaxed border-t border-border pt-3">
                    {it.explanation.text}
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
