'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Sidebar Context & Provider
 * 
 * Gestiona el estado expandido/colapsado de la barra lateral con persistencia en localStorage.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = 'mekanos_sidebar_collapsed_v3';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // ✅ Por defecto SIEMPRE desplegada (false), el usuario decide si comprimirla
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Solo colapsar si el usuario guardó explícitamente 'true' en esta versión
      if (saved === 'true') {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    } catch {
      // Ignorar excepciones de localStorage
      setIsCollapsed(false);
    }
  }, []);

  const toggle = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  };

  const collapse = () => {
    setIsCollapsed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignorar
    }
  };

  const expand = () => {
    setIsCollapsed(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {
      // Ignorar
    }
  };

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
