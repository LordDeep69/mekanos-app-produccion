/**
 * MEKANOS S.A.S - Portal Admin
 * RecentOrdersTable - Tabla de órdenes recientes
 * 
 * Muestra las últimas órdenes con navegación a detalle.
 * Los datos vienen ya transformados desde dashboard.service.ts
 */

'use client';

import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { OrdenRecienteUI } from '../api/dashboard.service';
import { useOrdenesRecientes } from '../hooks/use-dashboard';

// Mapeo de estados a colores
const estadoStyles: Record<string, { bg: string; text: string }> = {
  PENDIENTE: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  ASIGNADA: { bg: 'bg-blue-100', text: 'text-blue-800' },
  EN_PROGRESO: { bg: 'bg-purple-100', text: 'text-purple-800' },
  COMPLETADA: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELADA: { bg: 'bg-red-100', text: 'text-red-800' },
  FINALIZADA: { bg: 'bg-green-100', text: 'text-green-800' },
};

function getEstadoStyle(estadoCodigo: string) {
  const normalized = estadoCodigo?.toUpperCase().replace(/\s+/g, '_') || 'PENDIENTE';
  return estadoStyles[normalized] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Sin fecha';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function RecentOrdersTable() {
  const { data, isLoading, isError, error } = useOrdenesRecientes(5);
  const router = useRouter();

  const handleRowClick = (id: number) => {
    router.push(`/ordenes/${id}`);
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Órdenes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="error"
            title="Error al cargar órdenes"
            message={error?.message || 'No se pudieron cargar las órdenes recientes.'}
          />
        </CardContent>
      </Card>
    );
  }

  // Los datos ya vienen transformados como OrdenRecienteUI[] desde el servicio
  const ordenes: OrdenRecienteUI[] = data || [];

  if (!ordenes || ordenes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5" />
            Órdenes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            variant="noData"
            title="Sin órdenes recientes"
            message="No hay órdenes de trabajo registradas."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Órdenes Recientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordenes.map((orden) => {
                const style = getEstadoStyle(orden.estadoCodigo);
                
                return (
                  <tr
                    key={orden.id}
                    onClick={() => handleRowClick(orden.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {orden.numeroOrden}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {orden.cliente}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${style.bg} ${style.text} font-medium`}>
                        {orden.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(orden.fecha)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
