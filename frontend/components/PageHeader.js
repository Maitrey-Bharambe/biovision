export function PageHeader({ eyebrow, title, description, right }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-6 flex-wrap">
      <div className="flex-1 min-w-0">
        {eyebrow && (
          <div className="pill mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display font-semibold text-3xl md:text-5xl text-ink leading-[1.05] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-base text-ink2/75 mt-4 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
