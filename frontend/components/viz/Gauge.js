'use client';

/**
 * A circular gauge — confidence / accuracy / anomaly-score.
 * `value` in [0,1]. Newsprint palette: ink + accent for the top end.
 */
export function Gauge({ value = 0, label, hint, tone = 'teal', size = 130 }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const dash = c * pct;
  const color = {
    teal: '#111111', rose: '#CC0000', gold: '#AD6A1A', deep: '#111111',
  }[tone] || '#111111';
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E5E0" strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
                strokeWidth="10" strokeLinecap="butt"
                strokeDasharray={`${dash} ${c-dash}`}
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x={size/2} y={size/2 + 2} textAnchor="middle"
              fontSize={size/4.2} fontWeight="700" fill="#111111"
              fontFamily="JetBrains Mono, monospace">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      {label && <div className="eyebrow text-meta !text-[10px] mt-1">{label}</div>}
      {hint && <div className="text-sm text-ink font-sans font-semibold">{hint}</div>}
    </div>
  );
}
