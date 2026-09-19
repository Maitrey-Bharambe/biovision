'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [q, setQ] = useState('');
  const router = useRouter();

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    // Any query goes to /genome and prefills the gene selector via hash
    router.push(`/genome#gene=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2 flex-1 max-w-2xl">
      <div className="relative flex-1">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4" strokeLinecap="round"/>
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search genes, proteins, mutations…"
          className="w-full pl-11 pr-4 py-2.5 rounded-full !bg-white !border-border/70 text-sm shadow-card"
        />
      </div>
    </form>
  );
}

export function TopBar({ user = 'Researcher' }) {
  return (
    <div className="flex items-center justify-between gap-6 mb-8 flex-wrap">
      <SearchBar />
      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-full bg-white border border-border shadow-card flex items-center justify-center text-ink relative" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 004 0"/>
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose"/>
        </button>
        <div className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-white border border-border shadow-card">
          <div className="w-8 h-8 rounded-full bg-deep text-white flex items-center justify-center font-semibold text-sm">
            {user[0]}
          </div>
          <div className="text-sm font-medium text-ink">{user}</div>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
            <path d="M2 4l4 4 4-4" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
