export function Card({ title, subtitle, className = '', children, actions, variant='glass' }) {
  const base = variant === 'solid' ? 'card-solid' : 'card';
  return (
    <div className={`${base} ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && <div className="card-heading">{title}</div>}
            {subtitle && <div className="text-sm text-ink2/80 mt-1.5 leading-snug">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'default', icon }) {
  const toneClass = {
    default: 'text-ink',
    good:    'text-teal',
    warn:    'text-gold',
    bad:     'text-rose',
    accent:  'text-teal',
  }[tone] || 'text-ink';
  return (
    <div className="card !py-5">
      <div className="flex items-center justify-between">
        <div className="card-heading">{label}</div>
        {icon && <div className="text-teal">{icon}</div>}
      </div>
      <div className={`mt-3 text-3xl metric-value ${toneClass}`}>{value ?? '—'}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}
