/**
 * EXPORTS - MÓDULO EQUIPOS
 */

// Componentes
export { ConfigParametrosEditor } from './components/ConfigParametrosEditor';
export { EquipoForm } from './components/EquipoForm';
export { EquipoRepuestosTab } from './components/EquipoRepuestosTab';
export { EquipoPendientesTab } from './components/EquipoPendientesTab';
export { HojaVidaEquipo } from './components/hoja-vida-equipo';

// Servicios y hooks
export {
    equiposService,
    useActualizarDatosEspecificos,
    useActualizarEquipo,
    useCambiarEstadoEquipo,
    useClientesParaSelect,
    useCrearEquipo,
    useEliminarEquipoCompletamente,
    useEquipo,
    useEquipos,
    useRegistrarLecturaHorometro,
    useTrazabilidadEquipo,
    type TrazabilidadEquipoResponse,
} from './lib/equipos.service';

// Tipos
export * from './types';

// BOM, expediente logístico e historial WMS del activo
export {
  BOM_APLICACIONES,
  equiposBomService,
  useActualizarBomEquipo,
  useComponentesCompatiblesEquipo,
  useDesvincularBomEquipo,
  useFichaLogisticaEquipo,
  useVincularBomEquipo,
  type ActualizarBomPayload,
  type BomItem,
  type EstadoStockBom,
  type FichaLogisticaEquipo,
  type OrdenEquipoResumen,
  type RepuestoInstalado,
} from './lib/equipos-bom.service';
