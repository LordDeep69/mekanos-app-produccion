-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚀 OPTIMIZACIÓN ENTERPRISE 05-ENE-2026: ÍNDICES COMPUESTOS
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- PROBLEMA: Queries frecuentes sin índices dedicados causan full table scans
-- SOLUCIÓN: Índices compuestos para los filtros más comunes
-- IMPACTO: Reducción de 1-2 segundos en queries de órdenes
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Conectar a la base de datos PostgreSQL de Supabase
-- 2. Ejecutar este script completo
-- 3. Verificar con EXPLAIN ANALYZE que las queries usan los índices
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA TABLA ordenes_servicio
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice 1: Filtro por estado + ordenamiento por fecha (MÁS COMÚN en listados)
-- Uso: Lista de órdenes filtradas por estado, ordenadas por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_estado_fecha 
ON ordenes_servicio(id_estado_actual, fecha_programada DESC NULLS LAST);

-- Índice 2: Filtro por técnico + estado (Dashboard de técnico)
-- Uso: Ver órdenes asignadas a un técnico específico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_tecnico_estado 
ON ordenes_servicio(id_tecnico_asignado, id_estado_actual) 
WHERE id_tecnico_asignado IS NOT NULL;

-- Índice 3: Filtro por cliente + estado (Historial de cliente)
-- Uso: Ver todas las órdenes de un cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_cliente_estado 
ON ordenes_servicio(id_cliente, id_estado_actual);

-- Índice 4: Ordenamiento por fecha de creación (Listado general)
-- Uso: Mostrar órdenes más recientes primero
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_fecha_creacion 
ON ordenes_servicio(fecha_creacion DESC);

-- Índice 5: Filtro por tipo de servicio + estado
-- Uso: Filtrar órdenes por tipo de mantenimiento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_tipo_estado 
ON ordenes_servicio(id_tipo_servicio, id_estado_actual) 
WHERE id_tipo_servicio IS NOT NULL;

-- Índice 6: Prioridad + estado (Órdenes urgentes)
-- Uso: Dashboard de órdenes urgentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_prioridad_estado 
ON ordenes_servicio(prioridad, id_estado_actual);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA TABLA clientes (Selectores)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice para búsqueda de clientes activos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientes_activo 
ON clientes(activo) WHERE activo = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA TABLA equipos (Selectores)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice para filtrar equipos por cliente
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipos_cliente 
ON equipos(id_cliente);

-- Índice para filtrar equipos por cliente y sede
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipos_cliente_sede 
ON equipos(id_cliente, id_sede) WHERE id_sede IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA TABLA personas (Búsquedas)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice para búsqueda por nombre comercial (más común)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personas_nombre_comercial 
ON personas(nombre_comercial) WHERE nombre_comercial IS NOT NULL;

-- Índice para búsqueda por NIT/Identificación
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_personas_identificacion 
ON personas(numero_identificacion);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ÍNDICES PARA DASHBOARD (Agregaciones)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Índice para contar órdenes del mes actual
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_mes_creacion 
ON ordenes_servicio(date_trunc('month', fecha_creacion));

-- Índice para contar órdenes completadas del mes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ordenes_fecha_fin 
ON ordenes_servicio(fecha_fin_real) WHERE fecha_fin_real IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ESTADÍSTICAS ACTUALIZADAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Actualizar estadísticas después de crear índices
ANALYZE ordenes_servicio;
ANALYZE clientes;
ANALYZE equipos;
ANALYZE personas;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Query para verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('ordenes_servicio', 'clientes', 'equipos', 'personas')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
