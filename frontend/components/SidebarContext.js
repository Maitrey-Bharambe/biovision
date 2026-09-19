'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const SidebarCtx = createContext({ open: true, toggle: () => {} });

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(true);

  // restore preference
  useEffect(() => {
    try {
      const s = localStorage.getItem('bv_sidebar_open');
      if (s !== null) setOpen(s === '1');
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('bv_sidebar_open', open ? '1' : '0'); } catch {}
  }, [open]);

  return (
    <SidebarCtx.Provider value={{ open, toggle: () => setOpen(v => !v), setOpen }}>
      {children}
    </SidebarCtx.Provider>
  );
}

export function useSidebar() { return useContext(SidebarCtx); }
