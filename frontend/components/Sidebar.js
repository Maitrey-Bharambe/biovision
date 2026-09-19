'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';

const I = {
  home:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  helix:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4c4 4 8 4 12 0M6 20c4-4 8-4 12 0M6 4v16M18 4v16"/></svg>,
  rna:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20l8-16 8 16M8 14h8" strokeLinejoin="round"/></svg>,
  protein:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="10" r="3"/><circle cx="12" cy="17" r="3"/><path d="M10 10l3 3M14 12l0 3"/></svg>,
  mutation: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg>,
  cv:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  brain:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3a4 4 0 00-4 4 4 4 0 00-2 3 3 3 0 003 3v3a3 3 0 003 3M15 3a4 4 0 014 4 4 4 0 012 3 3 3 0 01-3 3v3a3 3 0 01-3 3"/></svg>,
  olap:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="12" width="4" height="8"/><rect x="10" y="6" width="4" height="14"/><rect x="17" y="9" width="4" height="11"/></svg>,
  db:       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>,
  flask:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3"/></svg>,
  play:     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>,
  chev:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round"/></svg>,
};

const nav = [
  { href: '/',          label: 'Home',              icon: I.home },
  { href: '/genome',    label: 'Genome Explorer',   icon: I.helix },
  { href: '/rna',       label: 'RNA Expression',    icon: I.rna },
  { href: '/protein',   label: 'Protein Explorer',  icon: I.protein },
  { href: '/mutation',  label: 'Mutation Analysis', icon: I.mutation },
  { href: '/biovision', label: 'BioVision (CV)',    icon: I.cv },
  { href: '/ai-lab',    label: 'AI & Mining Lab',   icon: I.brain },
  { href: '/alpha',     label: 'AlphaGenome Lab',   icon: I.helix },
  { href: '/olap',      label: 'OLAP Analytics',    icon: I.olap },
  { href: '/warehouse', label: 'Data Warehouse',    icon: I.db },
  { href: '/demo',      label: 'Live Demo',         icon: I.play },
];

/** Floating open button — shown when the sidebar is collapsed. */
export function SidebarOpenButton() {
  const { open, toggle } = useSidebar();
  if (open) return null;
  return (
    <button
      onClick={toggle}
      aria-label="Open menu"
      className="fixed top-8 left-4 md:left-5 z-50 w-11 h-11 rounded-2xl bg-white border border-border shadow-cardhi flex items-center justify-center text-ink hover:bg-[#eaf8fb] transition"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { open, toggle } = useSidebar();

  return (
    <aside
      className={`shrink-0 hidden md:block sticky top-0 h-screen bg-white/70 backdrop-blur
                  ${open ? 'border-r border-border/60' : 'border-r-0'}
                  transition-[width] duration-300 ease-out overflow-hidden
                  ${open ? 'w-64' : 'w-0'}`}
      style={{ minWidth: 0 }}
    >
     <div className="w-64 h-screen flex flex-col px-5 py-6">
      {/* Brand + close */}
      <div className="flex items-center justify-between mb-8 px-2">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal to-deep flex items-center justify-center text-white shadow-cardhi">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4c4 4 8 4 12 0M6 20c4-4 8-4 12 0M6 4v16M18 4v16" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="font-display font-bold text-lg text-ink leading-tight whitespace-nowrap">BioVision</div>
            <div className="text-[10px] text-muted mt-0.5 whitespace-nowrap">Data. Biology. Discovery.</div>
          </div>
        </Link>
        <button onClick={toggle} aria-label="Close menu"
                className="w-8 h-8 rounded-lg text-muted hover:text-ink hover:bg-white flex items-center justify-center">
          {I.chev}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto -mx-2 space-y-1 px-2">
        {nav.map((it) => {
          const active = pathname === it.href
                      || (it.href !== '/' && pathname?.startsWith(it.href));
          return (
            <Link key={it.href} href={it.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 text-sm rounded-2xl transition-all whitespace-nowrap ${
                active
                  ? 'bg-deep text-white shadow-card'
                  : 'text-ink2/80 hover:bg-white hover:text-ink'
              }`}>
              <span className={active ? 'text-mint' : 'text-teal'}>{it.icon}</span>
              <span className="font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>

     </div>
    </aside>
  );
}
