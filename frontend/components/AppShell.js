'use client';
import { useSidebar } from './SidebarContext';
import { Sidebar, SidebarOpenButton } from './Sidebar';
import { BackButton } from './BackButton';
import { Disclaimer } from './Disclaimer';

/**
 * Client shell that reacts to sidebar state. When the sidebar is closed
 * we reserve a small gutter on the left of <main> so the floating open
 * button never sits on top of the content.
 */
export function AppShell({ children }) {
  const { open } = useSidebar();
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <SidebarOpenButton />
      <main
        className={`flex-1 py-8 md:py-10 max-w-[1600px] mx-auto w-full transition-[padding] duration-300
                    ${open ? 'px-6 md:px-10' : 'pl-20 md:pl-24 pr-6 md:pr-10'}`}
      >
        <BackButton />
        {children}
        <Disclaimer />
      </main>
    </div>
  );
}
