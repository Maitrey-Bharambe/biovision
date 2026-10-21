/**
 * Editorial page header — issue-style masthead strip plus an oversized
 * serif title and a Lora sub-lede.  Used by every interior page.
 */
export function PageHeader({ eyebrow, title, description, right, vol = 'VOL. 01' }) {
  return (
    <div className="mb-8">
      <div className="editorial-strip">
        <span>BIOVISION · {eyebrow || 'RESEARCH SYSTEMS'}</span>
        <span className="hidden md:inline font-mono tracking-[0.14em] text-meta">
          {vol} · MULTI-OMICS INTELLIGENCE
        </span>
      </div>

      <div className="flex items-start justify-between gap-6 flex-wrap mt-5">
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-ink text-4xl md:text-6xl leading-[1.02] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="lede mt-4 max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <div className="rule-h mt-6" />
    </div>
  );
}
