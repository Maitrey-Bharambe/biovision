'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from './SidebarContext';

/* ------------------------------------------------------------
 * Icon set — a single stroke style so the sidebar reads evenly.
 * ---------------------------------------------------------- */
const I = {
  overview: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  nexus:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><circle cx="4" cy="4" r="1.5"/><circle cx="20" cy="4" r="1.5"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="20" r="1.5"/><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/></svg>),
  saved:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>),
  helix:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 4c4 4 8 4 12 0M6 20c4-4 8-4 12 0M6 4v16M18 4v16"/></svg>),
  rna:      (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 20l8-16 8 16M8 14h8" strokeLinejoin="round"/></svg>),
  protein:  (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="10" r="3"/><circle cx="12" cy="17" r="3"/><path d="M10 10l3 3M14 12l0 3"/></svg>),
  mutation: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8"/><path d="M12 6v6l4 2"/></svg>),
  cube:     (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3l8 4v10l-8 4-8-4V7l8-4z"/><path d="M4 7l8 4 8-4M12 11v10" /></svg>),
  mining:   (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M8 7h8M8 17h8M6 9v6M18 9v6"/></svg>),
  cv:       (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>),
  flask:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-5-9V3"/></svg>),
  pill:     (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="9" width="18" height="6" rx="3"/><path d="M12 9v6"/></svg>),
  source:   (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>),
  health:   (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>),
  cog:      (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.3-2l2-1.5-2-3.4-2.4.8a7 7 0 00-3.3-1.9L12 1.5l-3 .5A7 7 0 005.7 4L3.3 3.1l-2 3.4L3.3 8A7 7 0 003 10v2a7 7 0 00.3 2l-2 1.5 2 3.4 2.4-.8a7 7 0 003.3 1.9L12 22.5l3-.5a7 7 0 003.3-1.9l2.4.8 2-3.4-2-1.5A7 7 0 0019 14z"/></svg>),
  chev:     (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round"/></svg>),
};

const GROUPS = [
  { label: 'WORKSPACE', items: [
    { href: '/',       label: 'Overview',             icon: I.overview },
    { href: '/nexus',  label: 'BioVision Nexus',      icon: I.nexus, badge: 'NEW' },
    { href: '/saved',  label: 'Saved Investigations', icon: I.saved },
  ]},
  { label: 'BIOLOGICAL DATA', items: [
    { href: '/genome',   label: 'Genome Explorer', icon: I.helix },
    { href: '/rna',      label: 'Transcriptome',   icon: I.rna },
    { href: '/protein',  label: 'Proteomics',      icon: I.protein },
    { href: '/mutation', label: 'Mutations',       icon: I.mutation },
  ]},
  { label: 'ANALYTICS', items: [
    { href: '/olap',      label: '3D OLAP Cube',          icon: I.cube },
    { href: '/ai-lab',    label: 'Data Mining Studio',    icon: I.mining },
    { href: '/biovision', label: 'Vision & Explainability', icon: I.cv },
  ]},
  { label: 'RESEARCH TOOLS', items: [
    { href: '/alpha', label: 'DNA Editing Bench',      icon: I.flask },
    { href: '/alpha?tab=remedy', label: 'Precision Remedy Lookup', icon: I.pill },
  ]},
  { label: 'SYSTEM', items: [
    { href: '/sources',   label: 'Data Sources',    icon: I.source },
    { href: '/warehouse', label: 'Warehouse Health', icon: I.health },
    { href: '/demo',      label: 'Live Demo',       icon: I.cog },
  ]},
];

export function SidebarOpenButton() {
  const { open, toggle } = useSidebar();
  if (open) return null;
  return (
    <button
      onClick={toggle}
      aria-label="Open menu"
      className="fixed top-5 left-4 md:left-5 z-50 w-10 h-10 rounded-2xl bg-sidebar text-white border border-black shadow-cardhi flex items-center justify-center hover:bg-black transition"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      className={`shrink-0 hidden md:block sticky top-4 bottom-4 h-[calc(100vh-2rem)] ml-4
                  bg-sidebar text-white rounded-[28px] shadow-cardhi
                  transition-[width] duration-200 ease-out overflow-hidden
                  ${open ? 'w-56' : 'w-0'}`}
      style={{ minWidth: 0 }}
    >
      <div className="w-56 h-full flex flex-col px-3 py-5">
        {/* Masthead — matches the "intelly" wordmark style */}
        <div className="flex items-center justify-between mb-6 px-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display font-semibold text-[22px] text-white tracking-tight leading-none">
              biovision<span className="text-accent">.</span>
            </span>
          </Link>
          <button onClick={toggle} aria-label="Close menu"
                  className="w-6 h-6 rounded-md text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center">
            {I.chev}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto -mx-1 px-1">
          {GROUPS.map((g, gi) => (
            <div key={g.label} className={gi === 0 ? '' : 'mt-5'}>
              <div className="text-[10.5px] text-white/40 px-3 mb-1.5 capitalize">
                {g.label.toLowerCase()}
              </div>
              <div className="space-y-[2px]">
                {g.items.map((it) => {
                  const base = it.href.split('?')[0];
                  const active = pathname === base ||
                                 (base !== '/' && pathname?.startsWith(base));
                  return (
                    <Link key={it.href} href={it.href}
                      className={`relative flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-xl transition
                        ${active
                          ? 'bg-white text-ink font-medium'
                          : 'text-white/70 hover:bg-white/[0.08] hover:text-white'}`}>
                      {active && (
                        <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-accent" aria-hidden/>
                      )}
                      <span className={active ? 'text-ink' : 'text-white/55'}>{it.icon}</span>
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.badge && (
                        <span className="text-[9px] font-bold tracking-widest text-accent bg-accent/15 px-1.5 py-0.5 rounded-full">
                          {it.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-white/10 px-2">
          <div className="text-[10.5px] text-white/50">BioVision · v1.1</div>
          <div className="text-[10px] text-white/35 mt-0.5 font-mono">Research prototype</div>
        </div>
      </div>
    </aside>
  );
}
