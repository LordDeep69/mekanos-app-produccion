-- ============================================================================
-- FASE 5.9 EAM: Reingeniería Definitiva - Banco Universal y Constructor Rápido
-- Fecha: 2026-11-10
-- Propósito:
--   1. Desacoplar oficialmente catalogo_actividades de id_tipo_servicio (nullable)
--      para soportar plantillas puras en el Banco Universal (id_tipo_servicio NULL).
--   2. Vincular plantillas del Banco Universal a un arquetipo base (id_tipo_equipo)
--      y rastrear trazabilidad de instancias hacia su plantilla origen (id_plantilla_origen)
--      para propagación en cascada segura.
--   3. Vincular catalogo_sistemas con modulos_tecnicos (id_modulo) para auto-sincronización
--      bidireccional entre Partes/Subsistemas EAM y Subsistemas de Checklists/PDF.
--   ZERO-TRUST: 100% aditivo e idempotente. Preserva 100% filas existentes y Golden Master.
-- ============================================================================

BEGIN;

-- 1. Desacoplar id_tipo_servicio en catalogo_actividades
ALTER TABLE catalogo_actividades
  ALTER COLUMN id_tipo_servicio DROP NOT NULL;

-- 2. Columnas nuevas en catalogo_actividades
ALTER TABLE catalogo_actividades
  ADD COLUMN IF NOT EXISTS id_tipo_equipo INTEGER;

ALTER TABLE catalogo_actividades
  ADD COLUMN IF NOT EXISTS id_plantilla_origen INTEGER;

-- 3. Columna nueva en catalogo_sistemas
ALTER TABLE catalogo_sistemas
  ADD COLUMN IF NOT EXISTS id_modulo INTEGER;

-- 4. Llaves foráneas seguras (ON DELETE SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_actividades_tipo_equipo'
  ) THEN
    ALTER TABLE catalogo_actividades
      ADD CONSTRAINT fk_actividades_tipo_equipo
      FOREIGN KEY (id_tipo_equipo)
      REFERENCES tipos_equipo(id_tipo_equipo)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_actividades_plantilla_origen'
  ) THEN
    ALTER TABLE catalogo_actividades
      ADD CONSTRAINT fk_actividades_plantilla_origen
      FOREIGN KEY (id_plantilla_origen)
      REFERENCES catalogo_actividades(id_actividad_catalogo)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_sistemas_modulo'
  ) THEN
    ALTER TABLE catalogo_sistemas
      ADD CONSTRAINT fk_sistemas_modulo
      FOREIGN KEY (id_modulo)
      REFERENCES modulos_tecnicos(id_modulo)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Índices de consulta rápida para filtros EAM y propagación
CREATE INDEX IF NOT EXISTS idx_actividades_tipo_servicio
  ON catalogo_actividades(id_tipo_servicio);

CREATE INDEX IF NOT EXISTS idx_actividades_tipo_equipo
  ON catalogo_actividades(id_tipo_equipo);

CREATE INDEX IF NOT EXISTS idx_actividades_plantilla_origen
  ON catalogo_actividades(id_plantilla_origen);

CREATE INDEX IF NOT EXISTS idx_sistemas_id_modulo
  ON catalogo_sistemas(id_modulo);

-- 6. Backfill seguro no destructivo: heredar id_tipo_equipo de tipos_servicio si falta
UPDATE catalogo_actividades ca
SET id_tipo_equipo = ts.id_tipo_equipo
FROM tipos_servicio ts
WHERE ca.id_tipo_servicio = ts.id_tipo_servicio
  AND ca.id_tipo_equipo IS NULL
  AND ts.id_tipo_equipo IS NOT NULL;

COMMIT;
