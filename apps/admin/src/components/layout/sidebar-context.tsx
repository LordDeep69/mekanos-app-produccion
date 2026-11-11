'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Sidebar Context & Provider
 *
 * Gestiona el estado expandido/colapsado de la barra lateral con persistencia en localStorage.
 */

import React, { createContext, useContext, useSyncExternalStore } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'mekanos_sidebar_collapsed_v3';
const SIDEBAR_CHANGE_EVENT = 'mekanos-sidebar-change';

function subscribeSidebar(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

function getSidebarSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

function setSidebarCollapsedStorage(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Ignorar excepciones de localStorage
  }
  window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // ✅ Por defecto SIEMPRE desplegada (false), el usuario decide si comprimirla
  const isCollapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  const toggle = () => setSidebarCollapsedStorage(!isCollapsed);
  const collapse = () => setSidebarCollapsedStorage(true);
  const expand = () => setSidebarCollapsedStorage(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe utilizarse dentro de un SidebarProvider');
  }
  return context;
}
