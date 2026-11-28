-- ============================================================================
-- FASE 0: CIMIENTOS DELTA SYNC IDEMPOTENTE + PUSH FCM MULTI-TENANT
-- Migración 100% idempotente y segura sobre datos históricos existentes.
-- ============================================================================

-- 1. actividades_ejecutadas: columnas de identidad, versionado y soft-delete
ALTER TABLE actividades_ejecutadas
  ADD COLUMN IF NOT EXISTS client_uuid UUID,
  ADD COLUMN IF NOT EXISTS sync_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS updated_by_device_at TIMESTAMP(6),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(6);

CREATE UNIQUE INDEX IF NOT EXISTS uq_actividades_ejecutadas_client_uuid
  ON actividades_ejecutadas (client_uuid);

-- Índice único parcial seguro para filas sincronizadas (preserva histórico legado con client_uuid NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_actividades_ejecutadas_natural_sync
  ON actividades_ejecutadas (id_orden_servicio, COALESCE(id_orden_equipo, 0), id_actividad_catalogo)
  WHERE deleted_at IS NULL AND id_actividad_catalogo IS NOT NULL AND client_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actividades_ejecutadas_orden_activas
  ON actividades_ejecutadas (id_orden_servicio, id_orden_equipo)
  WHERE deleted_at IS NULL;

-- 2. mediciones_servicio: columnas de identidad, versionado y soft-delete
ALTER TABLE mediciones_servicio
  ADD COLUMN IF NOT EXISTS client_uuid UUID,
  ADD COLUMN IF NOT EXISTS sync_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(6);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mediciones_servicio_client_uuid
  ON mediciones_servicio (client_uuid);

CREATE UNIQUE INDEX IF NOT EXISTS uq_mediciones_servicio_natural_sync
  ON mediciones_servicio (id_orden_servicio, COALESCE(id_orden_equipo, 0), id_parametro_medicion)
  WHERE deleted_at IS NULL AND client_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mediciones_servicio_orden_activas
  ON mediciones_servicio (id_orden_servicio, id_orden_equipo)
  WHERE deleted_at IS NULL;

-- 3. evidencias_fotograficas: identidad, proveedor agnóstico (CLOUDINARY/R2), clave y soft-delete
ALTER TABLE evidencias_fotograficas
  ADD COLUMN IF NOT EXISTS client_uuid UUID,
  ADD COLUMN IF NOT EXISTS sync_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) NOT NULL DEFAULT 'CLOUDINARY',
  ADD COLUMN IF NOT EXISTS storage_key VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(6);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidencias_fotograficas_client_uuid
  ON evidencias_fotograficas (client_uuid);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidencias_fotograficas_dedup_sync
  ON evidencias_fotograficas (
    id_orden_servicio,
    hash_sha256,
    COALESCE(id_orden_equipo, 0),
    COALESCE(id_actividad_ejecutada, 0)
  )
  WHERE deleted_at IS NULL AND client_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidencias_orden_hash_activas
  ON evidencias_fotograficas (id_orden_servicio, hash_sha256)
  WHERE deleted_at IS NULL;

-- 4. ordenes_pendientes: identidad, versionado y soft-delete
ALTER TABLE ordenes_pendientes
  ADD COLUMN IF NOT EXISTS client_uuid UUID,
  ADD COLUMN IF NOT EXISTS sync_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(6);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ordenes_pendientes_client_uuid
  ON ordenes_pendientes (client_uuid);

CREATE INDEX IF NOT EXISTS idx_ordenes_pendientes_orden_activos
  ON ordenes_pendientes (id_orden_servicio)
  WHERE deleted_at IS NULL;

-- 5. ordenes_servicio: versión de ejecución y última actividad exclusiva del técnico
ALTER TABLE ordenes_servicio
  ADD COLUMN IF NOT EXISTS execution_sync_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_actividad_tecnico_at TIMESTAMP(6);

CREATE INDEX IF NOT EXISTS idx_os_ultima_actividad_tecnico
  ON ordenes_servicio (ultima_actividad_tecnico_at DESC);

-- 6. ordenes_actividades_plan: deduplicación defensiva + índice único compuesto
DELETE FROM ordenes_actividades_plan a
USING ordenes_actividades_plan b
WHERE a.id_orden_actividad_plan > b.id_orden_actividad_plan
  AND a.id_orden_servicio = b.id_orden_servicio
  AND a.id_actividad_catalogo = b.id_actividad_catalogo;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ordenes_actividades_plan_orden_act
  ON ordenes_actividades_plan (id_orden_servicio, id_actividad_catalogo);

-- 7. dispositivos_push_tecnicos: registro FCM global multi-tenant para pings WAKE_SYNC
CREATE TABLE IF NOT EXISTS dispositivos_push_tecnicos (
  id             SERIAL PRIMARY KEY,
  id_usuario     INTEGER NOT NULL,
  id_empleado    INTEGER,
  fcm_token      VARCHAR(500) NOT NULL,
  plataforma     VARCHAR(20) NOT NULL,
  device_id      VARCHAR(150),
  app_version    VARCHAR(50),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_ping_at TIMESTAMP(6),
  created_at     TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispositivos_push_fcm_token
  ON dispositivos_push_tecnicos (fcm_token);

CREATE INDEX IF NOT EXISTS idx_dispositivos_push_usuario_activo
  ON dispositivos_push_tecnicos (id_usuario, activo);

CREATE INDEX IF NOT EXISTS idx_dispositivos_push_empleado_activo
  ON dispositivos_push_tecnicos (id_empleado, activo);

CREATE INDEX IF NOT EXISTS idx_dispositivos_push_device_id
  ON dispositivos_push_tecnicos (device_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_dispositivos_push_usuario'
  ) THEN
    ALTER TABLE dispositivos_push_tecnicos
      ADD CONSTRAINT fk_dispositivos_push_usuario
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_dispositivos_push_empleado'
  ) THEN
    ALTER TABLE dispositivos_push_tecnicos
      ADD CONSTRAINT fk_dispositivos_push_empleado
      FOREIGN KEY (id_empleado) REFERENCES empleados(id_empleado)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
