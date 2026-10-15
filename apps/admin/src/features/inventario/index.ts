/**
 * MEKANOS S.A.S - Portal Admin
 * Feature: Inventario - Barrel Export
 */

// API Services (Legacy)
export * from './api/inventario.service';

// Motor Transaccional (FASE 6 WMS)
export {
    useActualizarComponente,
    useAlertasStock,
    useBodegas,
    useComponentesStock,
    useCrearBodega,
    useDashboardKPIs,
    useDetalleComponente,
    useKardex as useKardexMotor,
    useKardexGlobal,
    useLotes,
    useMotivosAjuste,
    useProveedoresSelect,
    useRegistrarAjuste,
    useRegistrarEntrada,
    useRegistrarSalida,
    useRegistrarTraslado,
    useTiposComponente,
} from './api/inventario-motor.service';

// Components
export { BodegaModal } from './components/BodegaModal';
export { MovimientoModal } from './components/MovimientoModal';

// Hooks
export * from './hooks/use-inventario';
