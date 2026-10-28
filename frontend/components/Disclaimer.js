export function Disclaimer() {
  return (
    <footer className="mt-16 pt-5 border-t border-border/70">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="text-[12px] text-muted max-w-3xl leading-relaxed">
          BioVision is an academic research prototype. Analytical outputs reflect the current warehouse
          snapshot and heuristic models and must <span className="text-bad font-semibold">not</span> be
          interpreted as clinical diagnosis or medical advice.
        </div>
        <div className="meta !text-[10px]">EST. 2025 · Research workspace</div>
      </div>
    </footer>
  );
}
