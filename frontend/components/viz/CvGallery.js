'use client';

/**
 * A grid of the CNN's real predictions on BreastMNIST test images.
 * Correct predictions get an ink frame, wrong ones get an accent frame,
 * and a confidence bar sits under every scan.
 */
export function CvGallery({ items = [] }) {
  if (!items.length) return <div className="meta">Loading gallery…</div>;
  const acc = items.filter(x => x.correct).length / items.length;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-sm border-y border-ink py-2">
        <span className="pill">LIVE · BREASTMNIST TEST</span>
        <span className="meta">Model accuracy on this batch:</span>
        <span className="font-mono font-bold text-ink metric-value">{(acc*100).toFixed(0)}%</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((it, i) => (
          <div key={i}
               className={`overflow-hidden border-2 bg-white transition
                          ${it.correct ? 'border-ink' : 'border-accent'}`}>
            <div className="relative">
              <img src={it.image} alt={`sample ${it.index}`} className="w-full aspect-square object-cover"/>
              <div className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 border border-ink
                             ${it.correct ? 'bg-ink text-paper' : 'bg-accent text-paper'}`}>
                {it.correct ? '✓' : '✗'}
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1.5 text-[9px] text-white font-mono">
                <div className="opacity-80">true · {it.true_label}</div>
                <div className="font-semibold">pred · {it.predicted_label}</div>
              </div>
            </div>
            <div className="px-2 py-1.5 border-t border-ink">
              <div className="flex items-center justify-between meta !text-[9px] mb-1">
                <span>CONFIDENCE</span>
                <span className="font-mono tabular-nums font-semibold text-ink">{(it.confidence*100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-subtle border border-ink overflow-hidden">
                <div className={`h-full ${it.correct ? 'bg-ink' : 'bg-accent'}`}
                     style={{ width: `${it.confidence*100}%` }}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
