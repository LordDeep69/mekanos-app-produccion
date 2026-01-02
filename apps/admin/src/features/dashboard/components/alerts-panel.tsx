/**
 * MEKANOS S.A.S - Portal Admin
 * AlertsPanel - Panel de alertas críticas
 *
 * Muestra las alertas activas con prioridad visual
 */

'use client';

import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardAlertas } from '@/types/dashboard';
import {
    AlertTriangle,
    Bell,
    CalendarX,
    FileWarning,
    Package,
    Wrench,
} from 'lucide-react';

interface AlertItemProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  variant: 'danger' | 'warning' | 'info';
}

function AlertItem({ icon, label, count, variant }: AlertItemProps) {
  const variantStyles = {
    danger: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  if (count === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <Badge variant="secondary" className="font-bold">
        {count}
      </Badge>
    </div>
  );
}

interface AlertsPanelProps {
  data?: DashboardAlertas;
  isLoading?: boolean;
  error?: Error | null;
}

export function AlertsPanel({ data, isLoading, error }: AlertsPanelProps) {
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Error cargando alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">
            No se pudieron cargar las alertas. Intente de nuevo.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasNoAlerts = data.totalAlertas === 0;

  return (
    <Card className={cn(hasNoAlerts ? 'border-green-200' : 'border-orange-200')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell
            className={cn(
              'h-5 w-5',
              hasNoAlerts ? 'text-green-600' : 'text-orange-600'
            )}
          />
          Alertas Activas
          {!hasNoAlerts && (
            <Badge variant="destructive" className="ml-2">
              {data.totalAlertas}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {hasNoAlerts
            ? '✅ Todo está en orden'
            : 'Situaciones que requieren atención'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasNoAlerts ? (
          <div className="text-center py-6 text-green-600">
            <span className="text-4xl">🎉</span>
            <p className="mt-2 font-medium">Sin alertas pendientes</p>
          </div>
        ) : (
          <>
            <AlertItem
              icon={<CalendarX className="h-5 w-5" />}
              label="Órdenes vencidas"
              count={data.ordenesVencidas}
              variant="danger"
            />
            <AlertItem
              icon={<Wrench className="h-5 w-5" />}
              label="Equipos críticos"
              count={data.equiposCriticos}
              variant="danger"
            />
            <AlertItem
              icon={<Package className="h-5 w-5" />}
              label="Stock crítico"
              count={data.alertasStockCriticas}
              variant="warning"
            />
            <AlertItem
              icon={<FileWarning className="h-5 w-5" />}
              label="Contratos por vencer"
              count={data.contratosPorVencer}
              variant="warning"
            />
            <AlertItem
              icon={<Bell className="h-5 w-5" />}
              label="Notificaciones sin leer"
              count={data.notificacionesNoLeidas}
              variant="info"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
