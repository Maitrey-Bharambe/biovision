export function Card({ title, subtitle, className = '', children, actions, variant='glass' }) {
  const base = variant === 'solid' ? 'card-solid' : 'card';
  return (
    <div className={`${base} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            {title && <div className="card-heading">{title}</div>}
            {subtitle && (
              <div className="text-sm text-prose font-prose mt-1 leading-snug">
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'default', icon }) {
  const toneClass = {
    default: 'text-ink',
    good:    'text-[#2E7D32]',
    warn:    'text-[#AD6A1A]',
    bad:     'text-accent',
    accent:  'text-accent',
  }[tone] || 'text-ink';
  return (
    <div className="card !py-4">
      <div className="flex items-center justify-between">
        <div className="card-heading !mb-0 !pb-2">{label}</div>
        {icon && <div className="text-ink">{icon}</div>}
      </div>
      <div className={`mt-2 text-3xl metric-value ${toneClass}`}>{value ?? '—'}</div>
      {hint && <div className="text-xs text-meta mt-1 font-mono">{hint}</div>}
    </div>
  );
}
