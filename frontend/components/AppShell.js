'use client';
import { useSidebar } from './SidebarContext';
import { Sidebar, SidebarOpenButton } from './Sidebar';
import { BackButton } from './BackButton';
import { Disclaimer } from './Disclaimer';
import { ContextBreadcrumb } from './BioContext';

export function AppShell({ children }) {
  const { open } = useSidebar();
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <SidebarOpenButton />
      <main
        className={`flex-1 py-6 md:py-8 max-w-[1600px] mx-auto w-full transition-[padding] duration-200
                    ${open ? 'px-6 md:px-10' : 'pl-20 md:pl-24 pr-6 md:pr-10'}`}
      >
        <BackButton />
        <ContextBreadcrumb />
        {children}
        <Disclaimer />
      </main>
    </div>
  );
}
