'use client';

/**
 * A circular gauge — perfect for confidence / accuracy / anomaly-score.
 * `value` in [0,1]. `tone` picks the palette.
 */
export function Gauge({ value = 0, label, hint, tone = 'teal', size = 130 }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const color = { teal: '#0ea5b7', rose: '#e56b8f', gold: '#f4b942', deep: '#0a2540' }[tone] || '#0ea5b7';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eaf8fb" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${dash} ${c-dash}`}
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x={size/2} y={size/2 + 2} textAnchor="middle"
              fontSize={size/4.2} fontWeight="700" fill="#0a2540"
              fontFamily="Space Grotesk, sans-serif">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <div className="text-xs text-muted mt-1 uppercase tracking-widest">{label}</div>}
      {hint && <div className="text-sm text-ink font-medium">{hint}</div>}
    </div>
  );
}
