import Link from 'next/link';

/**
 * Editorial feature panel used across the front page.  A section number,
 * eyebrow, serif title, Lora blurb, a slot for the visualisation preview,
 * and a CTA line.  Keeps type and structure consistent so the sections
 * read like columns in a periodical rather than a card wall.
 */
export function FeatureSection({
  index = '01',
  eyebrow,
  title,
  blurb,
  href,
  cta = 'Read the section →',
  children,
  className = '',
  columns = 6,
}) {
  const span = {
    4: 'col-span-12 md:col-span-6 lg:col-span-4',
    6: 'col-span-12 md:col-span-6',
    8: 'col-span-12 lg:col-span-8',
    12:'col-span-12',
  }[columns] || 'col-span-12 md:col-span-6';

  return (
    <article className={`${span} ${className} border border-ink p-5 md:p-6 bg-white flex flex-col`}>
      <header className="mb-3">
        <div className="flex items-baseline gap-4 border-b border-ink pb-2">
          <span className="font-mono text-[11px] tracking-[0.22em] text-meta">§ {index}</span>
          <span className="eyebrow text-prose !text-[10px]">{eyebrow}</span>
        </div>
        <h3 className="font-display font-bold text-ink text-2xl md:text-3xl leading-[1.05] tracking-tight mt-3">
          {title}
        </h3>
        {blurb && (
          <p className="font-prose text-[14px] text-prose mt-2 leading-snug">
            {blurb}
          </p>
        )}
      </header>

      <div className="flex-1 min-h-0">{children}</div>

      {href && (
        <footer className="mt-4 border-t border-ink pt-3">
          <Link href={href}
            className="inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-ink hover:text-accent transition">
            {cta}
          </Link>
        </footer>
      )}
    </article>
  );
}
