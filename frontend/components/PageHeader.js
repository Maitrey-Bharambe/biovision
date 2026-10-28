/**
 * Compact page intro.  The AppHeader already prints the breadcrumb +
 * route title, so PageHeader is only used when a page wants to add a
 * one-line description and an optional eyebrow + right-aligned slot.
 * It intentionally no longer renders a second <h1>.
 */
export function PageHeader({ eyebrow, title, description, right }) {
  const hasTitle = Boolean(title);
  return (
    <div className="mb-5 flex items-start justify-between gap-6 flex-wrap">
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-semibold text-accent uppercase tracking-wider mb-1.5">
            {eyebrow}
          </div>
        )}
        {hasTitle && (
          <h2 className="font-sans font-semibold text-ink text-[22px] leading-tight tracking-tight">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-[13.5px] text-muted mt-1.5 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
