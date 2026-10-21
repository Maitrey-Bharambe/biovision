'use client';

/**
 * Ideogram of one human chromosome, drawn with real G-banding
 * (dark AT-rich bands vs. light GC-rich bands) and a mutation
 * marker at a real position.
 */
export function ChromosomeIdeogram({
  chromosome = '17',
  lengthMb = 83.3,
  mutationPos = 0.55,      // fraction of length
  mutationLabel = 'TP53 R175H',
}) {
  // Simplified G-banding pattern for chromosome 17 (widths as fractions,
  // shade: 0=white/light, 1=grey, 2=dark, 3=very dark). Enough to look real.
  const bands = [
    [0.05, 2, 'p13.3'],[0.03, 0, ''],[0.05, 2, 'p13.2'],[0.03, 0, ''],
    [0.05, 3, 'p13.1'],[0.03, 0, ''],[0.05, 2, 'p12'],  [0.03, 0, 'p11.2'],
    [0.05, 1, 'p11.1'],[0.02, 0, ''],
    // centromere gap
    [0.02, 4, ''],
    [0.03, 0, 'q11.1'],[0.05, 1, 'q11.2'],[0.03, 0, ''],
    [0.06, 3, 'q12'],  [0.04, 0, 'q21.1'],[0.05, 2, 'q21.2'],[0.03, 0, ''],
    [0.05, 3, 'q21.3'],[0.03, 0, 'q22'],  [0.05, 2, 'q23'], [0.03, 0, ''],
    [0.05, 3, 'q24'],  [0.03, 0, 'q25.1'],[0.05, 2, 'q25.3'],
  ];
  const shadeColors = ['#FFFFFF','#F5F5F5','#999999','#111111','#111111'];

  const width = 700, cy = 40, h = 34, pad = 30;
  const trackW = width - 2 * pad;

  // draw bands
  let x = pad;
  const shapes = [];
  bands.forEach(([w, s, name], i) => {
    const bw = w * trackW;
    const isCentromere = s === 4;
    if (isCentromere) {
      shapes.push(
        <g key={i}>
          <path d={`M${x} ${cy-h/2} L${x+bw/2} ${cy} L${x} ${cy+h/2} Z`} fill="#737373"/>
          <path d={`M${x+bw} ${cy-h/2} L${x+bw/2} ${cy} L${x+bw} ${cy+h/2} Z`} fill="#737373"/>
        </g>
      );
    } else {
      shapes.push(
        <rect key={i} x={x} y={cy - h/2} width={bw} height={h}
              fill={shadeColors[s]} stroke="#111111" strokeWidth="0.5"/>
      );
    }
    if (name) {
      shapes.push(
        <text key={`t${i}`} x={x + bw/2} y={cy + h/2 + 12}
              textAnchor="middle" fontSize="9" fill="#525252" fontFamily="JetBrains Mono">{name}</text>
      );
    }
    x += bw;
  });

  // rounded outline
  const outline = (
    <rect x={pad} y={cy - h/2} width={trackW} height={h}
          rx={h/2} fill="none" stroke="#111111" strokeWidth="1.4"/>
  );

  // mutation marker
  const mutX = pad + mutationPos * trackW;

  // axis labels
  const axis = [];
  for (let i = 0; i <= 5; i++) {
    const ax = pad + (i / 5) * trackW;
    axis.push(<text key={i} x={ax} y={cy + h/2 + 34} fontSize="10" fill="#525252"
                      fontFamily="JetBrains Mono" textAnchor="middle">
      {Math.round((i / 5) * lengthMb)} Mb
    </text>);
  }

  return (
    <svg viewBox={`0 0 ${width} 130`} className="w-full h-auto">
      <defs>
        <clipPath id="chr-clip">
          <rect x={pad} y={cy - h/2} width={trackW} height={h} rx={h/2}/>
        </clipPath>
      </defs>

      <g clipPath="url(#chr-clip)">{shapes}</g>
      {outline}

      {/* mutation marker */}
      <line x1={mutX} x2={mutX} y1={cy - h/2 - 12} y2={cy + h/2 + 12}
            stroke="#CC0000" strokeWidth="2"/>
      <rect x={mutX-6} y={cy - h/2 - 24} width="12" height="12" fill="#CC0000"/>
      <text x={mutX} y={cy - h/2 - 30} textAnchor="middle" fontSize="10" fill="#111111"
            fontFamily="JetBrains Mono" fontWeight="700">
        {mutationLabel}
      </text>

      {axis}

      {/* legend */}
      <g transform={`translate(${pad}, ${cy + h/2 + 46})`} fontFamily="Inter">
        <rect x="0" y="1" width="8" height="8" fill="#111111"/>
        <text x="14" y="9" fontSize="10" fill="#525252">Gene bands</text>
        <rect x="80" y="1" width="8" height="8" fill="#CC0000"/>
        <text x="94" y="9" fontSize="10" fill="#525252">Mutations</text>
        <rect x="170" y="1" width="8" height="8" fill="#2E7D32"/>
        <text x="184" y="9" fontSize="10" fill="#525252">High expression</text>
      </g>
    </svg>
  );
}
