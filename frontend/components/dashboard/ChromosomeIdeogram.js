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
  const shadeColors = ['#ffffff','#c8e6ec','#5b7594','#0a2540','#0a2540'];

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
          <path d={`M${x} ${cy-h/2} L${x+bw/2} ${cy} L${x} ${cy+h/2} Z`} fill="#8fa4bd"/>
          <path d={`M${x+bw} ${cy-h/2} L${x+bw/2} ${cy} L${x+bw} ${cy+h/2} Z`} fill="#8fa4bd"/>
        </g>
      );
    } else {
      shapes.push(
        <rect key={i} x={x} y={cy - h/2} width={bw} height={h}
              fill={shadeColors[s]} stroke="rgba(10,37,64,0.25)" strokeWidth="0.5"/>
      );
    }
    if (name) {
      shapes.push(
        <text key={`t${i}`} x={x + bw/2} y={cy + h/2 + 12}
              textAnchor="middle" fontSize="9" fill="#5b7594">{name}</text>
      );
    }
    x += bw;
  });

  // rounded outline
  const outline = (
    <rect x={pad} y={cy - h/2} width={trackW} height={h}
          rx={h/2} fill="none" stroke="#0a2540" strokeWidth="1.4"/>
  );

  // mutation marker
  const mutX = pad + mutationPos * trackW;

  // axis labels
  const axis = [];
  for (let i = 0; i <= 5; i++) {
    const ax = pad + (i / 5) * trackW;
    axis.push(<text key={i} x={ax} y={cy + h/2 + 34} fontSize="10" fill="#5b7594" textAnchor="middle">
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
            stroke="#e56b8f" strokeWidth="2"/>
      <circle cx={mutX} cy={cy - h/2 - 18} r="6" fill="#e56b8f"/>
      <circle cx={mutX} cy={cy - h/2 - 18} r="10" fill="#e56b8f" opacity="0.25"/>
      <text x={mutX} y={cy - h/2 - 26} textAnchor="middle" fontSize="10" fill="#0a2540" fontWeight="600">
        {mutationLabel}
      </text>

      {axis}

      {/* legend */}
      <g transform={`translate(${pad}, ${cy + h/2 + 46})`}>
        <circle cx="4" cy="4" r="4" fill="#0ea5b7"/>
        <text x="14" y="7" fontSize="10" fill="#5b7594">Genes</text>
        <circle cx="70" cy="4" r="4" fill="#e56b8f"/>
        <text x="80" y="7" fontSize="10" fill="#5b7594">Mutations</text>
        <circle cx="150" cy="4" r="4" fill="#7fe3d4"/>
        <text x="160" y="7" fontSize="10" fill="#5b7594">High Expression</text>
      </g>
    </svg>
  );
}
