-- ============================================================================
-- MEKANOS S.A.S - Migracion: tabla ordenes_eliminadas (Tombstones)
-- ============================================================================
-- Fecha: 29-Sep-2026
-- Proposito:
--   Registrar ordenes eliminadas o reasignadas para que la app movil offline
--   (SmartSyncService) pueda purgar de inmediato las ordenes que ya no le
--   pertenecen al tecnico, sin depender de que el tecnico abra la orden.
--
-- Problema que resuelve:
--   La tabla se consultaba e insertaba desde 3 modulos (sync.service.ts,
--   ordenes.controller.ts, prisma-orden-servicio.repository.ts) pero NUNCA fue
--   creada. Los INSERT fallaban en silencio dentro de catch (console.warn),
--   dejando basura sincronizada en los dispositivos tecnicos.
--
-- Nota de seguridad: NO tiene FK a ordenes_servicio porque la orden ya fue
--   eliminada cuando se registra la lapida. Se conservan numero_orden e
--   id_tecnico_asignado para diagnostico y para purgado dirigido.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ordenes_eliminadas (
  id_orden_servicio    INTEGER     NOT NULL,
  numero_orden         VARCHAR(50)             NOT NULL,
  id_tecnico_asignado  INTEGER,
  fecha_eliminacion    TIMESTAMP(6) NOT NULL DEFAULT NOW(),

  CONSTRAINT ordenes_eliminadas_pkey PRIMARY KEY (id_orden_servicio, fecha_eliminacion)
);

-- Indice principal del sync delta: filtra por tecnico + ventana temporal.
CREATE INDEX IF NOT EXISTS idx_ordenes_eliminadas_tecnico_fecha
  ON ordenes_eliminadas (id_tecnico_asignado, fecha_eliminacion DESC);

-- Permite el barrido global por fecha (sin filtro de tecnico).
CREATE INDEX IF NOT EXISTS idx_ordenes_eliminadas_fecha
  ON ordenes_eliminadas (fecha_eliminacion DESC);

COMMENT ON TABLE ordenes_eliminadas IS
  'Tombstones de ordenes eliminadas o reasignadas. Consumido por SmartSyncService (Flutter) para purgado offline.';

COMMIT;

-- ============================================================================
-- VERIFICACION POST-MIGRACION
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
--  WHERE table_name = 'ordenes_eliminadas';
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'ordenes_eliminadas';
--
-- PRUEBA FUNCIONAL (debe retornar 0 filas, no error):
-- SELECT id_orden_servicio FROM ordenes_eliminadas
--  WHERE id_tecnico_asignado = 1 AND fecha_eliminacion >= NOW() - INTERVAL '1 day';
