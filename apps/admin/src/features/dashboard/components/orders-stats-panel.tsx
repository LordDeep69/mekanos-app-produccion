/**
 * MEKANOS S.A.S - Portal Admin
 * OrdersStatsPanel - Panel de estadísticas de órdenes
 * 
 * Muestra KPIs de órdenes de trabajo con data real.
 */

'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { useDashboardOrdenes } from '../hooks/use-dashboard';
import { KPICard } from './kpi-card';

export function OrdersStatsPanel() {
  const { data, isLoading, isError, error } = useDashboardOrdenes();

  if (isLoading) {
    return <OrdersStatsSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Órdenes de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="error"
            title="Error al cargar órdenes"
            message={error?.message || 'No se pudieron cargar las estadísticas de órdenes.'}
          />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Órdenes de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="noData"
            title="Sin órdenes"
            message="No hay órdenes de trabajo registradas."
          />
        </CardContent>
      </Card>
    );
  }

  // Calcular porcentaje de completadas
  const completionRate = data.total > 0
    ? Math.round((data.completadasMes / data.total) * 100)
    : 0;

  // Calcular en proceso basado en porEstado
  const enProceso = data.porEstado?.find(e => 
    e.estado.toLowerCase().includes('proceso') || e.estado.toLowerCase() === 'en_progreso'
  )?.cantidad || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Órdenes de Trabajo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Total Órdenes"
            value={data.total}
            icon="ClipboardList"
            variant="info"
          />
          <KPICard
            title="Completadas (Mes)"
            value={data.completadasMes}
            icon="CheckCircle2"
            variant="success"
            trend={completionRate > 0 ? { value: completionRate, isPositive: true } : undefined}
          />
          <KPICard
            title="Pendientes"
            value={data.pendientes}
            icon="Clock"
            variant={data.pendientes > 10 ? 'warning' : 'info'}
          />
          <KPICard
            title="En Proceso"
            value={enProceso}
            icon="Wrench"
            variant="info"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersStatsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
