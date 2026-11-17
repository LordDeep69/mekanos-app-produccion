-- ============================================================================
-- MEKANOS S.A.S - Migracion: autorizacion de edicion tecnica por orden
-- ============================================================================
-- Fecha: 19-Oct-2026
-- Proposito:
--   Permitir que el administrador habilite, orden por orden, la correccion y
--   resubida de una orden COMPLETADA desde la app movil del tecnico.
--
-- Reglas de negocio:
--   - Solo aplica a ordenes en estado COMPLETADA.
--   - CERRADA / CANCELADA / APROBADA no son editables.
--   - La autorizacion es explicita, revocable y auditada en
--     historial_estados_orden.
--   - Cada cambio (habilitar/revocar) debe actualizar fecha_modificacion para
--     que SmartSyncService lo detecte en el proximo ciclo de comparacion.
--
-- Nota: migracion aditiva e idempotente. No modifica datos existentes.
-- ============================================================================

BEGIN;

ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS edicion_tecnico_habilitada         BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS edicion_tecnico_autorizada_por     INTEGER,
  ADD COLUMN IF NOT EXISTS edicion_tecnico_fecha_autorizacion TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS edicion_tecnico_motivo             VARCHAR(500);

COMMENT ON COLUMN ordenes_servicio.edicion_tecnico_habilitada IS
  'TRUE solo si un administrador autorizo al tecnico a corregir/resubir esta orden COMPLETADA.';
COMMENT ON COLUMN ordenes_servicio.edicion_tecnico_autorizada_por IS
  'id_usuario del administrador que realizo la ultima habilitacion/revocacion.';
COMMENT ON COLUMN ordenes_servicio.edicion_tecnico_fecha_autorizacion IS
  'Fecha/hora de la ultima habilitacion o revocacion.';
COMMENT ON COLUMN ordenes_servicio.edicion_tecnico_motivo IS
  'Motivo opcional registrado por el administrador en la ultima decision.';

COMMIT;

-- ============================================================================
-- VERIFICACION POST-MIGRACION
-- ============================================================================
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--  WHERE table_name = 'ordenes_servicio'
--    AND column_name LIKE 'edicion_tecnico%';
--
-- Debe retornar 4 columnas y 0 filas con edicion_tecnico_habilitada = TRUE
-- antes de que el administrador utilice la funcionalidad:
-- SELECT COUNT(*) FROM ordenes_servicio WHERE edicion_tecnico_habilitada = TRUE;
