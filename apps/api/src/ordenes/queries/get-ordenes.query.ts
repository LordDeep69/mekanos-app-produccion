/**
 * Query: GetOrdenesQuery
 * Obtiene lista paginada de órdenes con filtros y ordenamiento
 * 
 * ENTERPRISE: Soporta sortBy y sortOrder para ordenamiento flexible
 * ✅ 31-ENE-2026: MULTI-ASESOR - Agregado idAsesorAsignado para filtrar por clientes del asesor
 * ✅ 28-OCT-2026: Soporte de filtros de Casos y Pendientes en SQL (Continuidad Operativa)
 * ✅ 29-OCT-2026: Soporte Server-Side para filtros de entregables (Correo, PDF, Pendientes)
 */
export class GetOrdenesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly clienteId?: number,
    public readonly equipoId?: number,
    public readonly tecnicoId?: number,
    public readonly estado?: string,
    public readonly prioridad?: string,
    public readonly sortBy: string = 'fecha_creacion', // Campo por el cual ordenar
    public readonly sortOrder: 'asc' | 'desc' = 'desc', // Dirección del ordenamiento
    public readonly tipoServicioId?: number, // Filtro por tipo de servicio
    public readonly fechaDesde?: string, // Filtro fecha desde (ISO string)
    public readonly fechaHasta?: string, // Filtro fecha hasta (ISO string)
    public readonly idAsesorAsignado?: number, // ✅ MULTI-ASESOR: Filtro por clientes del asesor
    public readonly busqueda?: string, // ✅ BÚSQUEDA: texto libre (numero_orden, cliente, técnico, equipo)
    public readonly idServicio?: number, // ✅ Filtro por servicio específico del catálogo (catalogo_servicios)
    public readonly servicioTexto?: string, // ✅ Búsqueda inteligente por palabra clave de servicio (ej: 'RADIADOR')
    public readonly filtroCaso?: string, // ✅ FILTRO CASOS: 'CASOS_ABIERTOS' | 'CON_PENDIENTES' | 'TODAS'
    public readonly conPendientes?: boolean, // ✅ Filtro de órdenes con pendientes técnicos activos
    public readonly filtroCorreo?: string, // ✅ 'CON' | 'SIN'
    public readonly filtroPdf?: string, // ✅ 'CON' | 'SIN'
    public readonly filtroPendientes?: string, // ✅ 'CON' | 'SIN'
  ) { }
}
