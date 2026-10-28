'use client';
import { useSidebar } from './SidebarContext';
import { Sidebar, SidebarOpenButton } from './Sidebar';
import { AppHeader } from './AppHeader';
import { Disclaimer } from './Disclaimer';

export function AppShell({ children }) {
  const { open } = useSidebar();
  return (
    <div className="min-h-screen flex bg-canvas text-ink">
      <Sidebar />
      <SidebarOpenButton />
      <main
        className={`flex-1 w-full max-w-[1600px] mx-auto transition-[padding] duration-200
                    ${open ? 'pl-5 md:pl-8 pr-6 md:pr-8 py-6' : 'pl-20 md:pl-24 pr-6 md:pr-10 py-6'}`}
      >
        <AppHeader />
        {children}
        <Disclaimer />
      </main>
    </div>
  );
}
