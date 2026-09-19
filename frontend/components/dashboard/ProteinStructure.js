'use client';

/**
 * Stylized "ribbon" protein structure. SVG-only, keeps everything offline
 * and consistent with the reference look (helical folds in blue/purple).
 * `gene` is used to slightly vary the pose so each protein looks distinct.
 */
export function ProteinStructure({ gene = 'p53' }) {
  // seed pose from gene name
  const seed = [...gene].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (n) => ((seed * 9301 + 49297) % 233280) / 233280 * n;

  return (
    <div className="relative w-full h-56">
      <svg viewBox="0 0 320 220" className="w-full h-full">
        <defs>
          <linearGradient id="rib1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#a5c7f8"/>
            <stop offset="100%" stopColor="#3d61c1"/>
          </linearGradient>
          <linearGradient id="rib2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#c9b8f4"/>
            <stop offset="100%" stopColor="#6a44b8"/>
          </linearGradient>
          <linearGradient id="rib3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor="#7fe3d4"/>
            <stop offset="100%" stopColor="#0ea5b7"/>
          </linearGradient>
          <filter id="softshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2"/>
          </filter>
        </defs>

        {/* helix 1 — spiral */}
        <g transform={`translate(80,110) rotate(${rand(30) - 15})`}>
          {[...Array(14)].map((_, i) => {
            const angle = i * 0.55;
            const radius = 30 + i * 0.6;
            const x = Math.cos(angle) * radius;
            const y = i * 8 - 55;
            return (
              <ellipse key={i} cx={x} cy={y} rx="22" ry="8"
                       fill="url(#rib1)" opacity={0.85} filter="url(#softshadow)"/>
            );
          })}
        </g>

        {/* helix 2 — offset */}
        <g transform={`translate(180,120) rotate(${rand(20) - 25})`}>
          {[...Array(12)].map((_, i) => {
            const angle = i * 0.6 + 0.5;
            const radius = 26 + i * 0.5;
            const x = Math.cos(angle) * radius;
            const y = i * 8 - 40;
            return (
              <ellipse key={i} cx={x} cy={y} rx="18" ry="7"
                       fill="url(#rib2)" opacity={0.9} filter="url(#softshadow)"/>
            );
          })}
        </g>

        {/* loop / turn */}
        <path d={`M 100 40 Q 180 20 240 60 T 280 160`}
              stroke="url(#rib3)" strokeWidth="8" fill="none"
              strokeLinecap="round" opacity="0.85"/>

        {/* backbone dots */}
        {[...Array(20)].map((_, i) => (
          <circle key={i} cx={40 + i * 12 + rand(4)} cy={200 - Math.sin(i * 0.6) * 12}
                  r="2" fill="#0a2540" opacity="0.35"/>
        ))}
      </svg>

      {/* corner tag */}
      <div className="absolute top-2 right-2 pill !py-1 !px-3 text-[10px]">3D Structure</div>
    </div>
  );
}
