-- ============================================================================
-- MIGRACIÓN: Flexibilización de Parámetros y Rangos
-- Fecha: 2026-01-06
-- Descripción: Agregar soporte para configuración personalizada de parámetros
--              por equipo, manteniendo compatibilidad con sistema existente.
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear tabla de plantillas de parámetros (opcional, para reutilización)
-- ============================================================================
CREATE TABLE IF NOT EXISTS plantillas_parametros (
    id_plantilla           SERIAL PRIMARY KEY,
    codigo_plantilla       VARCHAR(50) UNIQUE NOT NULL,
    nombre                 VARCHAR(100) NOT NULL,
    descripcion            TEXT,
    marca                  VARCHAR(50),
    modelo                 VARCHAR(50),
    id_tipo_equipo         INTEGER REFERENCES tipos_equipo(id_tipo_equipo) ON DELETE SET NULL,
    configuracion          JSONB NOT NULL DEFAULT '{}',
    activo                 BOOLEAN DEFAULT TRUE,
    creado_por             INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_creacion         TIMESTAMP DEFAULT NOW(),
    modificado_por         INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    fecha_modificacion     TIMESTAMP
);

-- Comentarios de documentación
COMMENT ON TABLE plantillas_parametros IS 'Plantillas reutilizables de configuración de parámetros para equipos de la misma marca/modelo';
COMMENT ON COLUMN plantillas_parametros.configuracion IS 'JSON con estructura: {unidades: {temperatura: "°C", presion: "PSI"}, rangos: {CODIGO_PARAM: {min_normal, max_normal, min_critico, max_critico}}, parametros_nominales: {RPM: 1800}}';

-- ============================================================================
-- PASO 2: Agregar columnas a tabla equipos
-- ============================================================================

-- 2.1 Columna JSONB para configuración personalizada de parámetros
-- DEFAULT '{}' asegura que equipos existentes NO se vean afectados
ALTER TABLE equipos 
ADD COLUMN IF NOT EXISTS config_parametros JSONB DEFAULT '{}';

-- 2.2 FK opcional a plantilla de parámetros
ALTER TABLE equipos 
ADD COLUMN IF NOT EXISTS id_plantilla_parametros INTEGER REFERENCES plantillas_parametros(id_plantilla) ON DELETE SET NULL;

-- Comentarios de documentación
COMMENT ON COLUMN equipos.config_parametros IS 'Configuración personalizada de parámetros para este equipo específico. Si está vacío ({}), usa valores del catálogo global. Estructura: {unidades: {...}, rangos: {...}, parametros_nominales: {...}}';
COMMENT ON COLUMN equipos.id_plantilla_parametros IS 'FK opcional a plantilla de configuración. Si el equipo tiene config_parametros propio, este tiene prioridad sobre la plantilla.';

-- ============================================================================
-- PASO 3: Crear índices para optimizar consultas
-- ============================================================================

-- Índice GIN para búsquedas dentro del JSONB
CREATE INDEX IF NOT EXISTS idx_equipos_config_parametros 
ON equipos USING GIN (config_parametros);

-- Índice para FK de plantilla
CREATE INDEX IF NOT EXISTS idx_equipos_plantilla_parametros 
ON equipos (id_plantilla_parametros) 
WHERE id_plantilla_parametros IS NOT NULL;

-- Índice para búsqueda de plantillas por marca/modelo
CREATE INDEX IF NOT EXISTS idx_plantillas_marca_modelo 
ON plantillas_parametros (marca, modelo) 
WHERE activo = TRUE;

-- ============================================================================
-- PASO 4: Verificación de migración
-- ============================================================================

-- Query de verificación (ejecutar después de la migración)
-- SELECT 
--     column_name, 
--     data_type, 
--     column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'equipos' 
--   AND column_name IN ('config_parametros', 'id_plantilla_parametros');

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================
-- 
-- REGLA DE ORO: Si config_parametros = '{}' (vacío), el sistema DEBE
-- comportarse EXACTAMENTE igual que antes, usando el catálogo global.
--
-- PRIORIDAD DE RESOLUCIÓN:
-- 1. equipos.config_parametros (override específico del equipo)
-- 2. plantillas_parametros.configuracion (si tiene FK asignada)
-- 3. parametros_medicion (catálogo global - NUNCA SE MODIFICA)
--
-- ESTRUCTURA JSON ESPERADA:
-- {
--   "unidades": {
--     "temperatura": "°C",     // o "°F", "K"
--     "presion": "PSI",        // o "bar", "kPa", "atm"
--     "voltaje": "V"
--   },
--   "rangos": {
--     "GEN_TEMP_REFRIGERANTE": {
--       "min_normal": 70,
--       "max_normal": 95,
--       "min_critico": 50,
--       "max_critico": 110
--     }
--   },
--   "parametros_nominales": {
--     "RPM_NOMINAL": 1800,
--     "FRECUENCIA_NOMINAL": 60,
--     "VOLTAJE_NOMINAL": 220
--   }
-- }
-- ============================================================================
