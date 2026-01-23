/**
 * MEKANOS S.A.S - Portal Admin
 * Configuración Estratégica de Cache Enterprise
 * 
 * FILOSOFÍA: Diferentes tipos de datos requieren diferentes estrategias de cache.
 * - Catálogos: Datos casi estáticos → cache largo (30 min)
 * - Órdenes: Datos dinámicos → cache corto (2 min)
 * - Dashboard: Métricas → cache medio (5 min)
 * 
 * BENEFICIOS:
 * - Navegación instantánea entre vistas
 * - Menor carga al servidor
 * - UX fluida y profesional
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ESTRATEGIAS DE CACHE POR TIPO DE DATO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tiempos en milisegundos
 */
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;

/**
 * Estrategias de cache predefinidas
 */
export const CacheStrategy = {
    /**
     * STATIC: Para catálogos y datos que casi nunca cambian
     * - Estados de orden, tipos de servicio, sistemas, parámetros
     * - staleTime largo: datos se consideran frescos por 30 min
     * - gcTime muy largo: permanecen en memoria 60 min
     */
    STATIC: {
        staleTime: 30 * MINUTES,
        gcTime: 60 * MINUTES,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    },

    /**
     * SEMI_STATIC: Para selectores y listas de referencia
     * - Clientes, equipos, técnicos (cambian poco)
     * - staleTime medio: frescos por 15 min
     * - gcTime largo: 30 min en memoria
     */
    SEMI_STATIC: {
        staleTime: 15 * MINUTES,
        gcTime: 30 * MINUTES,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    },

    /**
     * DYNAMIC: Para datos que cambian frecuentemente
     * - Órdenes, actividades ejecutadas, evidencias
     * - staleTime corto: frescos por 2 min
     * - gcTime medio: 10 min en memoria
     */
    DYNAMIC: {
        staleTime: 2 * MINUTES,
        gcTime: 10 * MINUTES,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    },

    /**
     * REALTIME: Para datos que necesitan estar muy actualizados
     * - Dashboard, alertas, notificaciones
     * - staleTime muy corto: frescos por 1 min
     * - Refetch automático al volver a la ventana
     */
    REALTIME: {
        staleTime: 1 * MINUTES,
        gcTime: 5 * MINUTES,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
    },

    /**
     * INSTANT: Para datos que no deben cachearse
     * - Búsquedas, validaciones en tiempo real
     */
    INSTANT: {
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MAPEO DE QUERY KEYS A ESTRATEGIAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Define qué estrategia usar para cada tipo de query
 */
export const QueryKeyStrategies: Record<string, typeof CacheStrategy[keyof typeof CacheStrategy]> = {
    // Catálogos estáticos
    'tipos-servicio': CacheStrategy.STATIC,
    'estados-orden': CacheStrategy.STATIC,
    'sistemas': CacheStrategy.STATIC,
    'parametros-medicion': CacheStrategy.STATIC,
    'catalogo-actividades': CacheStrategy.STATIC,
    'catalogo-servicios': CacheStrategy.STATIC,

    // Selectores semi-estáticos
    'clientes-selector': CacheStrategy.SEMI_STATIC,
    'equipos-selector': CacheStrategy.SEMI_STATIC,
    'tecnicos-selector': CacheStrategy.SEMI_STATIC,
    'sedes-cliente': CacheStrategy.SEMI_STATIC,

    // Datos dinámicos
    'ordenes': CacheStrategy.DYNAMIC,
    'actividades': CacheStrategy.DYNAMIC,
    'mediciones': CacheStrategy.DYNAMIC,
    'evidencias': CacheStrategy.DYNAMIC,
    'firmas': CacheStrategy.DYNAMIC,

    // Dashboard y métricas
    'dashboard': CacheStrategy.REALTIME,
};

/**
 * Obtiene la estrategia de cache para una query key
 */
export function getCacheStrategy(queryKey: readonly unknown[]): typeof CacheStrategy[keyof typeof CacheStrategy] {
    const primaryKey = queryKey[0];

    if (typeof primaryKey === 'string' && primaryKey in QueryKeyStrategies) {
        return QueryKeyStrategies[primaryKey];
    }

    // Default: DYNAMIC para queries desconocidas
    return CacheStrategy.DYNAMIC;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES DE CACHE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Keys para prefetch en diferentes contextos
 */
export const PrefetchGroups = {
    /**
     * Datos necesarios para crear una orden
     */
    CREAR_ORDEN: [
        'tipos-servicio',
        'estados-orden',
        'clientes-selector',
        'tecnicos-selector',
    ],

    /**
     * Datos necesarios para el dashboard
     */
    DASHBOARD: [
        'dashboard',
    ],

    /**
     * Datos de catálogos completos
     */
    CATALOGOS: [
        'tipos-servicio',
        'estados-orden',
        'sistemas',
        'parametros-medicion',
        'catalogo-actividades',
    ],

    /**
     * Datos para configuración
     */
    CONFIGURACION: [
        'tipos-servicio',
        'sistemas',
        'parametros-medicion',
        'catalogo-actividades',
        'catalogo-servicios',
    ],
} as const;

/**
 * Tiempo de prefetch anticipado (ms antes de que expire staleTime)
 */
export const PREFETCH_THRESHOLD = 2 * MINUTES;
