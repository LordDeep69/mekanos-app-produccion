/**
 * MEKANOS S.A.S - Portal Admin
 * Hooks React Query para el Centro de Gobernanza EAM Universal (5 Capas)
 *
 * Incluye invalidación cruzada automática para mantener las 5 capas sincronizadas en tiempo real.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activarMagnitudBancoEam,
  reactivarTodasMagnitudesEam,
  setActivoMagnitudEam,
  setActivoDisciplinaEam,
  agregarItemBomOemEam,
  asignarAtributoModuloEam,
  buscarComponentesWmsEam,
  convertirUomEam,
  createArquetipoEam,
  createAtributoEam,
  createMagnitudEam,
  createModeloOemEam,
  createModuloEam,
  createPlanArquetipoEam,
  createTipoServicioEam,
  createUnidadEam,
  deleteArquetipoEam,
  deleteAtributoEam,
  deleteMagnitudEam,
  deleteModeloOemEam,
  deleteModuloEam,
  deletePlanArquetipoEam,
  deleteUnidadEam,
  desasignarAtributoModuloEam,
  desvincularModuloArquetipoEam,
  eliminarItemBomOemEam,
  getArquetipoEsquemaEam,
  getArquetiposEam,
  getAtributosEam,
  getBancoMagnitudesEam,
  getMagnitudesEam,
  getModeloOemDetalleEam,
  getModelosOemEam,
  getModuloDetalleEam,
  getModulosEam,
  getResumenEjecutivoEam,
  getTiposServicioEam,
  getUnidadesEam,
  updateArquetipoEam,
  updateAtributoEam,
  updateAtributoModuloEam,
  updateMagnitudEam,
  updateModeloOemEam,
  updateModuloEam,
  updatePlanArquetipoEam,
  updateUnidadEam,
  vincularModuloArquetipoEam,
} from '../api/catalogos-eam.service';

export const EAM_KEYS = {
  all: ['catalogos-eam'] as const,
  resumen: () => [...EAM_KEYS.all, 'resumen'] as const,
  magnitudes: () => [...EAM_KEYS.all, 'magnitudes'] as const,
  unidades: (magnitud?: string) => [...EAM_KEYS.all, 'unidades', magnitud || 'all'] as const,
  atributos: (params?: { search?: string; magnitud?: string; tipoDato?: string }) =>
    [...EAM_KEYS.all, 'atributos', params || {}] as const,
  modulos: () => [...EAM_KEYS.all, 'modulos'] as const,
  moduloDetalle: (codigo: string) => [...EAM_KEYS.all, 'modulo', codigo] as const,
  arquetipos: () => [...EAM_KEYS.all, 'arquetipos'] as const,
  arquetipoEsquema: (idTipo: number) => [...EAM_KEYS.all, 'arquetipo-esquema', idTipo] as const,
  modelosOem: (idTipo?: number) => [...EAM_KEYS.all, 'modelos-oem', idTipo || 'all'] as const,
  modeloOemDetalle: (idModelo: number) => [...EAM_KEYS.all, 'modelo-oem', idModelo] as const,
  componentesWms: (search?: string) => [...EAM_KEYS.all, 'componentes-wms', search || ''] as const,
  tiposServicio: (idTipo?: number) => [...EAM_KEYS.all, 'tipos-servicio', idTipo || 'all'] as const,
  bancoMagnitudes: () => [...EAM_KEYS.all, 'banco-magnitudes'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════

export function useResumenEjecutivoEam() {
  return useQuery({
    queryKey: EAM_KEYS.resumen(),
    queryFn: getResumenEjecutivoEam,
  });
}

export function useMagnitudesEam() {
  return useQuery({
    queryKey: EAM_KEYS.magnitudes(),
    queryFn: getMagnitudesEam,
  });
}

export function useBancoMagnitudesEam() {
  return useQuery({
    queryKey: EAM_KEYS.bancoMagnitudes(),
    queryFn: getBancoMagnitudesEam,
  });
}

export function useUnidadesEam(magnitud?: string) {
  return useQuery({
    queryKey: EAM_KEYS.unidades(magnitud),
    queryFn: () => getUnidadesEam(magnitud),
  });
}

export function useAtributosEam(params?: {
  search?: string;
  magnitud?: string;
  tipoDato?: string;
}) {
  return useQuery({
    queryKey: EAM_KEYS.atributos(params),
    queryFn: () => getAtributosEam(params),
  });
}

export function useModulosEam() {
  return useQuery({
    queryKey: EAM_KEYS.modulos(),
    queryFn: getModulosEam,
  });
}

export function useModuloDetalleEam(codigo: string | null) {
  return useQuery({
    queryKey: EAM_KEYS.moduloDetalle(codigo || ''),
    queryFn: () => getModuloDetalleEam(codigo!),
    enabled: Boolean(codigo),
  });
}

export function useArquetiposEam() {
  return useQuery({
    queryKey: EAM_KEYS.arquetipos(),
    queryFn: getArquetiposEam,
  });
}

export function useArquetipoEsquemaEam(idTipoEquipo: number | null) {
  return useQuery({
    queryKey: EAM_KEYS.arquetipoEsquema(idTipoEquipo || 0),
    queryFn: () => getArquetipoEsquemaEam(idTipoEquipo!),
    enabled: Boolean(idTipoEquipo && idTipoEquipo > 0),
  });
}

export function useModelosOemEam(idTipoEquipo?: number) {
  return useQuery({
    queryKey: EAM_KEYS.modelosOem(idTipoEquipo),
    queryFn: () => getModelosOemEam(idTipoEquipo),
  });
}

export function useModeloOemDetalleEam(idModelo: number | null) {
  return useQuery({
    queryKey: EAM_KEYS.modeloOemDetalle(idModelo || 0),
    queryFn: () => getModeloOemDetalleEam(idModelo!),
    enabled: Boolean(idModelo && idModelo > 0),
  });
}

export function useComponentesWmsEam(search?: string, enabled = true) {
  return useQuery({
    queryKey: EAM_KEYS.componentesWms(search),
    queryFn: () => buscarComponentesWmsEam(search),
    enabled,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function useConvertirUomEam() {
  return useMutation({
    mutationFn: convertirUomEam,
  });
}

export function useCreateMagnitudEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMagnitudEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useActivarMagnitudBancoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codigo_magnitud: string) => activarMagnitudBancoEam(codigo_magnitud),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateMagnitudEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, payload }: { codigo: string; payload: any }) =>
      updateMagnitudEam(codigo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeleteMagnitudEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codigo: string) => deleteMagnitudEam(codigo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useCreateUnidadEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createUnidadEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateUnidadEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, payload }: { codigo: string; payload: any }) =>
      updateUnidadEam(codigo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeleteUnidadEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codigo: string) => deleteUnidadEam(codigo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useCreateAtributoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAtributoEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateAtributoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, payload }: { codigo: string; payload: any }) =>
      updateAtributoEam(codigo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeleteAtributoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codigo: string) => deleteAtributoEam(codigo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useCreateModuloEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createModuloEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateModuloEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, payload }: { codigo: string; payload: any }) =>
      updateModuloEam(codigo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeleteModuloEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codigo: string) => deleteModuloEam(codigo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useAsignarAtributoModuloEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigoModulo, payload }: { codigoModulo: string; payload: any }) =>
      asignarAtributoModuloEam(codigoModulo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateAtributoModuloEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      codigoModulo,
      idAtributo,
      payload,
    }: {
      codigoModulo: string;
      idAtributo: number;
      payload: any;
    }) => updateAtributoModuloEam(codigoModulo, idAtributo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDesasignarAtributoModuloEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigoModulo, idAtributo }: { codigoModulo: string; idAtributo: number }) =>
      desasignarAtributoModuloEam(codigoModulo, idAtributo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useCreateArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createArquetipoEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idTipoEquipo, payload }: { idTipoEquipo: number; payload: any }) =>
      updateArquetipoEam(idTipoEquipo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeleteArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idTipoEquipo: number) => deleteArquetipoEam(idTipoEquipo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useVincularModuloArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      idTipoEquipo,
      payload,
    }: {
      idTipoEquipo: number;
      payload: { id_modulo: number; obligatorio?: boolean };
    }) => vincularModuloArquetipoEam(idTipoEquipo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDesvincularModuloArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idTipoEquipo, idModulo }: { idTipoEquipo: number; idModulo: number }) =>
      desvincularModuloArquetipoEam(idTipoEquipo, idModulo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useCreatePlanArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idTipoEquipo, payload }: { idTipoEquipo: number; payload: any }) =>
      createPlanArquetipoEam(idTipoEquipo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdatePlanArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      idTipoEquipo,
      idPlan,
      payload,
    }: {
      idTipoEquipo: number;
      idPlan: number;
      payload: any;
    }) => updatePlanArquetipoEam(idTipoEquipo, idPlan, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeletePlanArquetipoEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idTipoEquipo, idPlan }: { idTipoEquipo: number; idPlan: number }) =>
      deletePlanArquetipoEam(idTipoEquipo, idPlan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useCreateModeloOemEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createModeloOemEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useUpdateModeloOemEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idModelo, payload }: { idModelo: number; payload: any }) =>
      updateModeloOemEam(idModelo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useDeleteModeloOemEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteModeloOemEam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useAgregarItemBomOemEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      idModelo,
      payload,
    }: {
      idModelo: number;
      payload: { id_componente: number; cantidad_sugerida: number; rol_bom?: string; notas?: string };
    }) => agregarItemBomOemEam(idModelo, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useEliminarItemBomOemEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ idModelo, idBom }: { idModelo: number; idBom: number }) =>
      eliminarItemBomOemEam(idModelo, idBom),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useTiposServicioEam(idTipoEquipo?: number) {
  return useQuery({
    queryKey: EAM_KEYS.tiposServicio(idTipoEquipo),
    queryFn: () => getTiposServicioEam(idTipoEquipo),
  });
}

export function useCreateTipoServicioEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      codigo_tipo: string;
      nombre_tipo: string;
      categoria: string;
      id_tipo_equipo?: number;
      descripcion?: string;
      duracion_estimada_horas?: number;
      color_hex?: string;
    }) => createTipoServicioEam(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}


export function useSetActivoDisciplinaEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoria, activo }: { categoria: string; activo: boolean }) =>
      setActivoDisciplinaEam(categoria, activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useSetActivoMagnitudEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, activo }: { codigo: string; activo: boolean }) =>
      setActivoMagnitudEam(codigo, activo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

export function useReactivarTodasMagnitudesEam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reactivarTodasMagnitudesEam(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EAM_KEYS.all });
    },
  });
}

