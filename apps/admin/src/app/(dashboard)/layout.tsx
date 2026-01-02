/**
 * MEKANOS S.A.S - Portal Admin
 * Dashboard Layout - Rutas Protegidas
 * 
 * Este layout envuelve todas las páginas del dashboard
 * Incluye: Sidebar (izquierda) + Header (arriba) + Content (centro)
 * 
 * NOTA: SessionProvider está en el layout raíz (no duplicar aquí)
 */

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Fixed Left */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="pl-64">
        {/* Header - Fixed Top */}
        <Header />
        
        {/* Page Content - With padding for header */}
        <main className="min-h-[calc(100vh-4rem)] pt-16">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
