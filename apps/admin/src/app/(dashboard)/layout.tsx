'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * Dashboard Layout - Rutas Protegidas
 * 
 * Este layout envuelve todas las páginas del dashboard
 * Incluye: Sidebar (izquierda) + Header (arriba) + Content (centro)
 * Soporta barra lateral colapsable / desplegable de forma prémium y fluida.
 */

import { CacheWarmup } from '@/components/cache-warmup';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/sidebar-context';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div
      className={cn(
        'min-h-screen bg-gray-50 transition-all duration-300 ease-in-out',
        isCollapsed ? 'pl-[72px]' : 'pl-64'
      )}
    >
      {/* Header - Fixed Top */}
      <Header />

      {/* Page Content - With padding for header */}
      <main className="min-h-[calc(100vh-4rem)] pt-16">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Enterprise Cache Warmup - Precarga catálogos en background */}
        <CacheWarmup />

        {/* Sidebar - Fixed Left (Colapsable / Desplegable) */}
        <Sidebar />

        {/* Main Content Area con ancho dinámico fluido */}
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
