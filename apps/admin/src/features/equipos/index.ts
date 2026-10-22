/**
 * EXPORTS - MÓDULO EQUIPOS
 */

// Componentes
export { ConfigParametrosEditor } from './components/ConfigParametrosEditor';
export { EquipoForm } from './components/EquipoForm';
export { EquipoRepuestosTab } from './components/EquipoRepuestosTab';
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
  useComponentesCompatiblesEquipo,
  useDesvincularBomEquipo,
  useFichaLogisticaEquipo,
  useVincularBomEquipo,
  type BomItem,
  type FichaLogisticaEquipo,
  type OrdenEquipoResumen,
  type RepuestoInstalado,
} from './lib/equipos-bom.service';

