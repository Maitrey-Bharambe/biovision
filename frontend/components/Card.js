export function Card({ title, subtitle, className = '', children, actions, variant = 'default' }) {
  const base = variant === 'solid' ? 'card-solid' : 'card';
  return (
    <div className={`${base} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            {title && <div className="card-heading !mb-1">{title}</div>}
            {subtitle && (
              <div className="text-[13px] text-muted font-prose leading-snug">{subtitle}</div>
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
    good:    'text-good',
    warn:    'text-warn',
    bad:     'text-bad',
    accent:  'text-accent',
  }[tone] || 'text-ink';
  return (
    <div className="card !py-4">
      <div className="flex items-center justify-between">
        <div className="card-heading !mb-0">{label}</div>
        {icon && <div className="text-accent">{icon}</div>}
      </div>
      <div className={`mt-2 text-3xl metric-value ${toneClass}`}>{value ?? '—'}</div>
      {hint && <div className="text-xs text-muted mt-1 font-mono">{hint}</div>}
    </div>
  );
}

/** Compact metric block used in the hero/overview rail. */
export function MetricCard({ label, value, hint, color = 'accent' }) {
  const bar = {
    accent:     'bg-accent',
    genomics:   'bg-genomics',
    transcript: 'bg-transcript',
    proteomics: 'bg-proteomics',
    imaging:    'bg-imaging',
  }[color] || 'bg-accent';
  return (
    <div className="card !py-3.5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 h-1 w-10 ${bar}`} aria-hidden/>
      <div className="meta !text-[9.5px] mt-0.5">{label}</div>
      <div className="metric-value text-2xl mt-0.5">{value ?? '—'}</div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}
