/**
 * MEKANOS S.A.S - Portal Admin
 * Feature: Empleados - Barrel Export
 */

// API Services
export * from './api/empleados.service';

// Hooks
export * from './hooks/use-empleados';

// Components
export { EmpleadoForm } from './components/EmpleadoForm';
export { EmpleadoFormV2 } from './components/EmpleadoFormV2';

// Types (re-export from types folder)
export type {
    CreateEmpleadoDto,
    Empleado,
    EmpleadoConPersona,
    EmpleadosQueryParams,
    EmpleadosResponse,
    UpdateEmpleadoDto
} from '@/types/empleados';

export { getNombreCompleto, getRolDisplay } from '@/types/empleados';

