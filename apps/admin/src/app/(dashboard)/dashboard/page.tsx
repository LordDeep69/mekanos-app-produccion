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
import { Activity } from 'lucide-react';
import { useState } from 'react';

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

      {/* Grid de 2 columnas para Órdenes y Comercial */}
      <div className="grid md:grid-cols-2 gap-6">
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
