/**
 * MEKANOS S.A.S - Portal Admin
 * CommercialPanel - Panel de métricas comerciales
 * 
 * Muestra cotizaciones y valor pendiente con data real.
 */

'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import { useDashboardComercial } from '../hooks/use-dashboard';
import { KPICard } from './kpi-card';

/**
 * Formatea valor en COP
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CommercialPanel() {
  const { data, isLoading, isError, error } = useDashboardComercial();

  if (isLoading) {
    return <CommercialSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="error"
            title="Error al cargar datos comerciales"
            message={error?.message || 'No se pudieron cargar las métricas comerciales.'}
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
            <FileText className="h-5 w-5" />
            Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="noData"
            title="Sin datos comerciales"
            message="No hay cotizaciones registradas."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Comercial
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <KPICard
            title="Total Cotizaciones"
            value={data.totalCotizaciones}
            icon="ClipboardList"
            variant="info"
          />
          <KPICard
            title="Pendientes Respuesta"
            value={data.pendientesRespuesta}
            icon="Clock"
            variant={data.pendientesRespuesta > 5 ? 'warning' : 'info'}
          />
          <KPICard
            title="Aprobadas (Mes)"
            value={data.aprobadasMes}
            icon="CheckCircle2"
            variant="success"
          />
          <KPICard
            title="Valor Pendiente"
            value={formatCurrency(data.valorPendienteCOP)}
            icon="DollarSign"
            variant="info"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CommercialSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
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
