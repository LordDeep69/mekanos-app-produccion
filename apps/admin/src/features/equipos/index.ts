/**
 * EXPORTS - MÓDULO EQUIPOS
 */

// Componentes
export { EquipoForm } from './components/EquipoForm';

// Servicios y hooks
export {
    equiposService, useActualizarEstadoEquipo,
    useClientesParaSelect, useCrearEquipo, useEquipo, useEquipos
} from './lib/equipos.service';

// Tipos
export * from './types';
