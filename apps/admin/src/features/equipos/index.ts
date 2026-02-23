/**
 * EXPORTS - MÓDULO EQUIPOS
 */

// Componentes
export { ConfigParametrosEditor } from './components/ConfigParametrosEditor';
export { EquipoForm } from './components/EquipoForm';

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
    useRegistrarLecturaHorometro
} from './lib/equipos.service';

// Tipos
export * from './types';

