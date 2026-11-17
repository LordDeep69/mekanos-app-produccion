/**
 * MEKANOS S.A.S - Portal Admin
 * Dashboard Page - Centro de Comando Operativo
 * 
 * FASE 3 COMPLETADA: Data real del backend, sin mock data.
 * Arquitectura resiliente: cada panel es independiente.
 */

'use client';

import {
    AlertsPanel,
    CommercialPanel,
    OrdersStatsPanel,
    RecentOrdersTable,
    RefreshButton
} from '@/features/dashboard/components';
import { useRefreshDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { Activity, ShieldAlert, X } from 'lucide-react';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DeniedAccessBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deniedRoute = searchParams.get('denied');

  if (!deniedRoute) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-2xs">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0" />
        <div>
          <span className="font-semibold">Acceso restringido:</span>{' '}
          No cuentas con permisos suficientes para abrir{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono">{deniedRoute}</code>.
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.replace('/dashboard')}
        className="rounded-lg p-1 text-amber-700 hover:bg-amber-100"
        title="Cerrar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { refresh } = useRefreshDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    refresh();
    // Feedback visual mientras se refrescan los datos
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <DeniedAccessBanner />
      </Suspense>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="h-8 w-8 text-[#244673]" />
            Centro de Comando
          </h1>
          <p className="text-gray-500 mt-1">
            Panel de control operativo con datos en tiempo real
          </p>
        </div>
        <RefreshButton 
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing} 
        />
      </div>

      {/* Alertas Panel - Datos reales desde /api/dashboard/alertas */}
      <AlertsPanel />

      {/* Grid responsivo: 1 columna hasta lg, 2 columnas en xl (>=1280px) para evitar compresión de KPIs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Estadísticas de Órdenes - /api/dashboard/ordenes */}
        <OrdersStatsPanel />

        {/* Métricas Comerciales - /api/dashboard/comercial */}
        <CommercialPanel />
      </div>

      {/* Tabla de Órdenes Recientes - Full width */}
      <RecentOrdersTable />
    </div>
  );
}
