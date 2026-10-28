'use client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * The AppHeader now handles navigation context, so BackButton is a
 * compact chip rendered only when deep routes explicitly include it.
 * Returns null on top-level pages (/) and on all pages by default.
 * Pages that still want a back link can import and place <BackButton/>.
 */
export function BackButton({ label = 'Back', to, force = false }) {
  const router = useRouter();
  const pathname = usePathname();
  if (!force) return null;
  if (pathname === '/') return null;

  const go = () => {
    if (to) { router.push(to); return; }
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={go}
              className="btn-ghost btn !py-1.5 !px-3 !text-[12px]">
        <span aria-hidden>←</span>{label}
      </button>
      <Link href="/" className="meta !normal-case !tracking-normal hover:text-ink">Home</Link>
    </div>
  );
}
