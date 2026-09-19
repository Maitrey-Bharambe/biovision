'use client';

/**
 * Confusion matrix as a heatmap grid. `matrix` is a NxN array of ints,
 * `labels` are the class labels in the same order.
 */
export function ConfusionMatrix({ matrix = [[0,0],[0,0]], labels = ['Class A','Class B'], size = 260 }) {
  const N = matrix.length;
  const max = Math.max(1, ...matrix.flat());
  const total = matrix.flat().reduce((a,b)=>a+b, 0) || 1;
  const cell = Math.floor(size / N);

  const color = (v) => {
    const t = v / max;
    // gradient from #eaf8fb (light) to #0a2540 (deep navy)
    const rgb = [
      Math.round(234 - t * (234 - 10)),
      Math.round(248 - t * (248 - 37)),
      Math.round(251 - t * (251 - 64)),
    ];
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  };

  return (
    <div className="inline-block">
      <div className="flex">
        <div style={{ width: 90 }} />
        {labels.map((l, j) => (
          <div key={j} style={{ width: cell }} className="text-center text-[11px] text-muted font-medium truncate">
            {l}
          </div>
        ))}
      </div>
      {matrix.map((row, i) => (
        <div key={i} className="flex items-center">
          <div style={{ width: 90 }} className="text-right pr-2 text-[11px] text-muted font-medium truncate">
            {labels[i]}
          </div>
          {row.map((v, j) => {
            const bg = color(v);
            const t = v / max;
            const fg = t > 0.5 ? '#ffffff' : '#0a2540';
            return (
              <div key={j}
                   className="flex items-center justify-center border border-white"
                   style={{ width: cell, height: cell, background: bg, color: fg }}>
                <div className="text-center">
                  <div className="font-display font-bold text-xl leading-none">{v}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{((v/total)*100).toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex gap-3 mt-3 text-[10px] text-muted uppercase tracking-widest">
        <span>rows: true label</span>
        <span>·</span>
        <span>columns: model prediction</span>
      </div>
    </div>
  );
}
