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

  const color = (v, isDiag) => {
    const t = v / max;
    // Diagonal uses ink; off-diagonal uses accent red for errors.  Both
    // interpolate from paper → full strength, so correct cells stay dark and
    // confused cells show up red.
    if (isDiag) {
      const g = Math.round(249 - t * (249 - 17));
      return `rgb(${g},${g},${g})`;
    }
    const r = Math.round(249 - t * (249 - 204));
    const g = Math.round(249 - t * 249);
    const b = Math.round(247 - t * 247);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="inline-block">
      <div className="flex">
        <div style={{ width: 90 }} />
        {labels.map((l, j) => (
          <div key={j} style={{ width: cell }} className="text-center meta !text-[10px] truncate">
            {l}
          </div>
        ))}
      </div>
      {matrix.map((row, i) => (
        <div key={i} className="flex items-center">
          <div style={{ width: 90 }} className="text-right pr-2 meta !text-[10px] truncate">
            {labels[i]}
          </div>
          {row.map((v, j) => {
            const isDiag = i === j;
            const bg = color(v, isDiag);
            const t = v / max;
            const fg = t > 0.5 ? '#FFFFFF' : '#111111';
            return (
              <div key={j}
                   className="flex items-center justify-center border border-ink"
                   style={{ width: cell, height: cell, background: bg, color: fg }}>
                <div className="text-center">
                  <div className="font-mono font-bold text-xl leading-none">{v}</div>
                  <div className="text-[10px] opacity-70 mt-0.5 font-mono">{((v/total)*100).toFixed(0)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex gap-3 mt-3 meta !text-[10px]">
        <span>rows: true label</span>
        <span>·</span>
        <span>columns: model prediction</span>
      </div>
    </div>
  );
}
