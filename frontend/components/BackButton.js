'use client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

/** Back button used on interior pages. Hidden on the Home ("/") route.
 *  When there is no browser history to pop, falls back to Home.
 */
export function BackButton({ label = 'Back', to }) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/') return null;

  const go = () => {
    if (to) { router.push(to); return; }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={go}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white border border-border shadow-card text-sm text-ink hover:bg-[#eaf8fb] transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {label}
      </button>
      <Link href="/" className="text-xs text-muted hover:text-ink">Home</Link>
    </div>
  );
}
