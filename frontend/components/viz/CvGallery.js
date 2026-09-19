'use client';

/**
 * A grid of the CNN's real predictions on BreastMNIST test images.
 * Correct predictions get a teal frame, wrong ones get a red frame,
 * and a confidence bar sits under every scan.
 */
export function CvGallery({ items = [] }) {
  if (!items.length) return <div className="text-muted text-sm">Loading gallery…</div>;
  const acc = items.filter(x => x.correct).length / items.length;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="pill">Live · real BreastMNIST test images</span>
        <span className="text-muted">Model accuracy on this batch:</span>
        <span className="font-display font-bold text-teal">{(acc*100).toFixed(0)}%</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((it, i) => (
          <div key={i}
               className={`rounded-2xl overflow-hidden border-2 bg-white shadow-card transition
                          ${it.correct ? 'border-teal/60' : 'border-rose'}`}>
            <div className="relative">
              <img src={it.image} alt={`sample ${it.index}`} className="w-full aspect-square object-cover"/>
              <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full
                             ${it.correct ? 'bg-teal text-white' : 'bg-rose text-white'}`}>
                {it.correct ? '✓' : '✗'}
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-white">
                <div className="opacity-80">true · {it.true_label}</div>
                <div className="font-semibold">pred · {it.predicted_label}</div>
              </div>
            </div>
            <div className="px-2.5 py-2">
              <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                <span>confidence</span>
                <span className="tabular-nums font-semibold text-ink">{(it.confidence*100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#eaf8fb] overflow-hidden">
                <div className={`h-full ${it.correct ? 'bg-teal' : 'bg-rose'}`}
                     style={{ width: `${it.confidence*100}%` }}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
