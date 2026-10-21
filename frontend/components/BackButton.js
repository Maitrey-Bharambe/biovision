'use client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

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
    <div className="flex items-center gap-4 mb-6">
      <button
        onClick={go}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-ink bg-white text-xs font-bold tracking-[0.18em] uppercase text-ink hover:bg-ink hover:text-white transition"
      >
        <span aria-hidden>←</span>
        {label}
      </button>
      <Link href="/" className="meta hover:text-ink">↩ Home</Link>
    </div>
  );
}
