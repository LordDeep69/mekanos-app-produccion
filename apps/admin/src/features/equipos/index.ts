/**
 * EXPORTS - MÓDULO EQUIPOS
 */

// Componentes
export { ConfigParametrosEditor } from './components/ConfigParametrosEditor';
export { EquipoForm } from './components/EquipoForm';
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

