/**
 * Reusable analytical-insight panel.
 *
 * Takes an array of {text, source?} items and renders them in editorial
 * style with a monospace source stamp.  The caller is responsible for
 * producing truthful summaries from real data — this component only
 * decides how to print them.
 */
export function InsightPanel({ title = 'Insight', items = [] }) {
  if (!items.length) return null;
  return (
    <aside className="border border-ink bg-subtle p-4">
      <div className="editorial-strip !border-t-0 !pb-0 mb-2">
        <span>{title}</span>
        <span className="font-mono text-[10px] text-meta hidden md:inline">
          deterministic · derived from current view
        </span>
      </div>
      <ul className="font-prose text-sm text-ink space-y-1 pl-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="text-accent font-sans font-bold">◆</span>
            <span className="flex-1">
              {it.text}
              {it.source && (
                <span className="meta ml-2 !text-[10px]">[{it.source}]</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
