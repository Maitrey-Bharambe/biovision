export function Disclaimer() {
  return (
    <footer className="mt-14 border-t-2 border-ink pt-5 pb-2">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="text-[11px] text-prose max-w-3xl leading-relaxed font-prose">
          BioVision is an academic research prototype. Analytical outputs reflect
          the current warehouse snapshot and heuristic models; they must
          <span className="text-accent font-sans font-bold uppercase tracking-wider"> not </span>
          be interpreted as clinical diagnosis or medical advice.
        </div>
        <div className="meta">EST. 2025 · ONE PRINT, MANY MODELS</div>
      </div>
    </footer>
  );
}
