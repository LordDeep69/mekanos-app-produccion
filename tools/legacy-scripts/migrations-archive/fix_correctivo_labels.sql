-- ✅ FIX 03-FEB-2026: Cambiar labels de actividades de correctivo
-- PROBLEMA 2: Actualizar descripciones en catálogo de actividades

-- 1. Cambiar "SÍNTOMAS OBSERVADOS" por "FALLAS OBSERVADAS"
UPDATE catalogo_actividades
SET descripcion = 'FALLAS OBSERVADAS'
WHERE descripcion = 'SÍNTOMAS OBSERVADOS'
  AND tipo_servicio = 'GEN_CORR';

UPDATE catalogo_actividades
SET descripcion = 'FALLAS OBSERVADAS'
WHERE descripcion = 'SINTOMAS OBSERVADOS'
  AND tipo_servicio = 'GEN_CORR';

-- 2. Cambiar "DIAGNÓSTICO Y CAUSA RAÍZ" por "DIAGNÓSTICO"
UPDATE catalogo_actividades
SET descripcion = 'DIAGNÓSTICO'
WHERE descripcion = 'DIAGNÓSTICO Y CAUSA RAÍZ'
  AND tipo_servicio = 'GEN_CORR';

UPDATE catalogo_actividades
SET descripcion = 'DIAGNÓSTICO'
WHERE descripcion = 'DIAGNOSTICO Y CAUSA RAIZ'
  AND tipo_servicio = 'GEN_CORR';

-- Verificar cambios
SELECT id, descripcion, tipo_servicio, tipo_actividad
FROM catalogo_actividades
WHERE tipo_servicio = 'GEN_CORR'
  AND (descripcion LIKE '%FALLAS%' OR descripcion LIKE '%DIAGNÓSTICO%' OR descripcion LIKE '%DIAGNOSTICO%')
ORDER BY descripcion;
