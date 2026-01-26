-- ============================================================================
-- FIX: Eliminar duplicados de actividades y mediciones para orden 640
-- Fecha: 26-ENE-2026
-- Problema: La sincronización se ejecutó 5 veces, creando 5x registros
-- ============================================================================

-- PASO 1: Ver cuántos registros hay actualmente
SELECT 'ANTES - Actividades' as tipo, COUNT(*) as total FROM actividades_ejecutadas WHERE id_orden_servicio = 640;
SELECT 'ANTES - Mediciones' as tipo, COUNT(*) as total FROM mediciones_servicio WHERE id_orden_servicio = 640;

-- PASO 2: Eliminar duplicados de ACTIVIDADES
-- Mantener solo el registro con el ID más bajo para cada combinación única
DELETE FROM actividades_ejecutadas
WHERE id_actividad_ejecutada NOT IN (
    SELECT MIN(id_actividad_ejecutada)
    FROM actividades_ejecutadas
    WHERE id_orden_servicio = 640
    GROUP BY 
        id_orden_servicio,
        COALESCE(id_actividad_catalogo, -1),
        COALESCE(descripcion_manual, ''),
        sistema,
        estado
);

-- PASO 3: Eliminar duplicados de MEDICIONES
-- Mantener solo el registro con el ID más bajo para cada combinación única
DELETE FROM mediciones_servicio
WHERE id_medicion NOT IN (
    SELECT MIN(id_medicion)
    FROM mediciones_servicio
    WHERE id_orden_servicio = 640
    GROUP BY 
        id_orden_servicio,
        id_parametro_medicion,
        valor_numerico
);

-- PASO 4: Verificar resultado
SELECT 'DESPUÉS - Actividades' as tipo, COUNT(*) as total FROM actividades_ejecutadas WHERE id_orden_servicio = 640;
SELECT 'DESPUÉS - Mediciones' as tipo, COUNT(*) as total FROM mediciones_servicio WHERE id_orden_servicio = 640;
