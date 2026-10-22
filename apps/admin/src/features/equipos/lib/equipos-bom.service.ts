/**
 * SERVICIO BOM & EXPEDIENTE LOGÍSTICO DEL EQUIPO - MEKANOS S.A.S
 *
 * Conecta /equipos/[id] con el Catálogo Maestro, el Inventario WMS y las
 * Órdenes de Servicio:
 *  - GET    /equipos/:id/ficha-logistica
 *  - GET    /equipos/:id/componentes-compatibles
 *  - POST   /equipos/:id/componentes-compatibles
 *  - DELETE /equipos/:id/componentes-compatibles/:idRelacion
 */

import { apiClient } from '@/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type EstadoStockBom = 'OK' | 'BAJO' | 'AGOTADO';

export interface BomBodegaStock {
  id_ubicacion: number;
  codigo: string;
  nombre: string;
  stock: number;
}

export interface BomItem {
  id_componente_equipo: number;
  id_componente: number;
  categoria_aplicacion: string;
  aplicacion_label: string;
  posicion_descripcion: string;
  cantidad_requerida: number;
  frecuencia_cambio_horas: number | null;
  notas_tecnicas: string | null;
  fecha_ultimo_cambio: string | null;
  sku: string | null;
  referencia_fabricante: string | null;
  descripcion: string;
  marca: string | null;
  unidad: string;
  precio_compra: number;
  stock_actual: number;
  stock_minimo: number;
  estado_stock: EstadoStockBom;
  bodegas: BomBodegaStock[];
}

export interface RepuestoInstalado {
  id_componente_usado: number;
  fecha_uso: string | null;
  id_orden_servicio: number;
  numero_orden: string | null;
  id_componente: number | null;
  sku: string | null;
  descripcion: string;
  marca: string | null;
  cantidad: number;
  unidad: string;
  costo_unitario: number;
  costo_total: number;
  origen_componente: string | null;
  bodega_codigo: string | null;
  bodega_nombre: string | null;
  codigo_lote: string | null;
  id_movimiento_inventario: number | null;
}

export interface OrdenEquipoResumen {
  id_orden_servicio: number;
  numero_orden: string;
  fecha_programada: string | null;
  fecha_creacion: string | null;
  fecha_fin_real: string | null;
  prioridad: string | null;
  total_general: number;
  estado_codigo: string | null;
  estado_nombre: string | null;
  estado_color: string | null;
  tipo_servicio: string | null;
  categoria_servicio: string | null;
  tecnico: string | null;
}

export interface FichaLogisticaEquipo {
  id_equipo: number;
  codigo_equipo: string;
  repuestos_compatibles: BomItem[];
  repuestos_instalados: RepuestoInstalado[];
  ordenes: OrdenEquipoResumen[];
  resumen: {
    total_ordenes: number;
    total_bom: number;
    bom_agotados: number;
    bom_bajo_minimo: number;
    total_lineas_instaladas: number;
    total_unidades_instaladas: number;
    total_inversion_repuestos: number;
    ultimo_cambio: string | null;
  };
}

export interface VincularBomPayload {
  id_componente: number;
  categoria_aplicacion: string;
  cantidad_requerida: number;
  frecuencia_cambio_horas?: number | null;
  notas_tecnicas?: string | null;
}

/** Catálogo cerrado de aplicaciones (espejo del backend). */
export const BOM_APLICACIONES: Array<{ value: string; label: string }> = [
  { value: 'FILTRO_ACEITE', label: 'Filtro de Aceite' },
  { value: 'FILTRO_COMBUSTIBLE', label: 'Filtro de Combustible' },
  { value: 'FILTRO_SEPARADOR_AGUA', label: 'Filtro Separador de Agua' },
  { value: 'FILTRO_AIRE', label: 'Filtro de Aire' },
  { value: 'LUBRICANTE_MOTOR', label: 'Aceite de Motor' },
  { value: 'REFRIGERANTE', label: 'Refrigerante' },
  { value: 'CORREA', label: 'Correa' },
  { value: 'BATERIA', label: 'Batería de Arranque' },
  { value: 'SELLO_MECANICO', label: 'Sello Mecánico' },
  { value: 'RODAMIENTO', label: 'Rodamiento / Cojinete' },
  { value: 'REPUESTO_GENERAL', label: 'Repuesto General' },
];

export const equiposBomKeys = {
  ficha: (id: number) => ['equipo-ficha-logistica', id] as const,
  compatibles: (id: number) => ['equipo-componentes-compatibles', id] as const,
};

export const equiposBomService = {
  async obtenerFichaLogistica(id: number): Promise<FichaLogisticaEquipo> {
    const res = await apiClient.get<{ success: boolean; data: FichaLogisticaEquipo }>(
      `/equipos/${id}/ficha-logistica`
    );
    return res.data.data;
  },

  async obtenerComponentesCompatibles(id: number): Promise<BomItem[]> {
    const res = await apiClient.get<{ success: boolean; data: BomItem[] }>(
      `/equipos/${id}/componentes-compatibles`
    );
    return res.data.data;
  },

  async vincular(id: number, payload: VincularBomPayload): Promise<BomItem> {
    const res = await apiClient.post<{ success: boolean; data: BomItem }>(
      `/equipos/${id}/componentes-compatibles`,
      payload
    );
    return res.data.data;
  },

  async desvincular(id: number, idRelacion: number): Promise<void> {
    await apiClient.delete(`/equipos/${id}/componentes-compatibles/${idRelacion}`);
  },
};

export function useFichaLogisticaEquipo(id: number) {
  return useQuery({
    queryKey: equiposBomKeys.ficha(id),
    queryFn: () => equiposBomService.obtenerFichaLogistica(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useComponentesCompatiblesEquipo(id?: number | null) {
  return useQuery({
    queryKey: equiposBomKeys.compatibles(id || 0),
    queryFn: () => equiposBomService.obtenerComponentesCompatibles(id as number),
    enabled: !!id && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useVincularBomEquipo(idEquipo: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VincularBomPayload) => equiposBomService.vincular(idEquipo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposBomKeys.ficha(idEquipo) });
      qc.invalidateQueries({ queryKey: equiposBomKeys.compatibles(idEquipo) });
    },
  });
}

export function useDesvincularBomEquipo(idEquipo: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idRelacion: number) => equiposBomService.desvincular(idEquipo, idRelacion),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: equiposBomKeys.ficha(idEquipo) });
      qc.invalidateQueries({ queryKey: equiposBomKeys.compatibles(idEquipo) });
    },
  });
}
