/**
 * MEKANOS S.A.S - Portal Admin
 * Feature: Inventario - Barrel Export
 */

// API Services (Legacy)
export * from './api/inventario.service';

// Motor Transaccional (FASE 6)
export {
    useActualizarComponente, useAlertasStock, useComponentesStock, useDashboardKPIs, useDetalleComponente, useKardex as useKardexMotor, useProveedoresSelect, useRegistrarEntrada,
    useRegistrarSalida, useTiposComponente
} from './api/inventario-motor.service';

// Components
export { MovimientoModal } from './components/MovimientoModal';

// Hooks
export * from './hooks/use-inventario';

// Types (re-export from types folder)
export type {
    Componente,
    ComponenteConStock,
    ComponentesQueryParams,
    ComponentesResponse,
    CreateComponenteDto,
    InventarioKPIs,
    KardexComponente,
    KardexEntry,
    MovimientoInventario,
    MovimientosQueryParams,
    MovimientosResponse,
    OrigenMovimiento,
    RegistrarMovimientoDto,
    RegistrarTrasladoDto,
    StockComponente,
    StockPorUbicacion,
    TipoComponente,
    TipoMovimiento
} from '@/types/inventario';

export {
    getEstadoStockColor,
    getEstadoStockLabel,
    getTipoMovimientoLabel
} from '@/types/inventario';

