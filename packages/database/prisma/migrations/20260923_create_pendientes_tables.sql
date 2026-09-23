-- ============================================================================
-- MIGRACIÓN: Sistema Inteligente de Pendientes por Órdenes de Servicio
-- Fecha: 23-SEP-2026
-- ============================================================================

-- 1. Crear ENUM para origen del pendiente si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origen_pendiente_enum') THEN
        CREATE TYPE origen_pendiente_enum AS ENUM ('CATALOGO', 'PERSONALIZADO');
    END IF;
END$$;

-- 2. Crear ENUM para estado del pendiente si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pendiente_orden_enum') THEN
        CREATE TYPE estado_pendiente_orden_enum AS ENUM ('PENDIENTE', 'EN_GESTION', 'RESUELTO', 'CANCELADO');
    END IF;
END$$;

-- 3. Tabla: catalogo_pendientes (Catálogo maestro sugerido)
CREATE TABLE IF NOT EXISTS catalogo_pendientes (
    id_pendiente_catalogo SERIAL PRIMARY KEY,
    codigo VARCHAR(50),
    descripcion VARCHAR(300) NOT NULL,
    categoria VARCHAR(100) DEFAULT 'GENERAL',
    id_tipo_equipo INTEGER REFERENCES tipos_equipo(id_tipo_equipo) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    orden_visual INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_catalogo_pendientes_categoria ON catalogo_pendientes(categoria);
CREATE INDEX IF NOT EXISTS idx_catalogo_pendientes_activo ON catalogo_pendientes(activo);
CREATE INDEX IF NOT EXISTS idx_catalogo_pendientes_tipo_equipo ON catalogo_pendientes(id_tipo_equipo);

-- 4. Tabla: ordenes_pendientes (Pendientes específicos por orden de servicio)
CREATE TABLE IF NOT EXISTS ordenes_pendientes (
    id_orden_pendiente SERIAL PRIMARY KEY,
    id_orden_servicio INTEGER NOT NULL REFERENCES ordenes_servicio(id_orden_servicio) ON DELETE CASCADE,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    id_equipo INTEGER NOT NULL REFERENCES equipos(id_equipo) ON DELETE CASCADE,
    id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL,
    id_pendiente_catalogo INTEGER REFERENCES catalogo_pendientes(id_pendiente_catalogo) ON DELETE SET NULL,
    descripcion VARCHAR(1000) NOT NULL,
    origen origen_pendiente_enum DEFAULT 'CATALOGO',
    prioridad prioridad_enum DEFAULT 'NORMAL',
    estado estado_pendiente_orden_enum DEFAULT 'PENDIENTE' NOT NULL,
    observaciones TEXT,
    creado_por INTEGER REFERENCES empleados(id_empleado) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_resolucion TIMESTAMP(6),
    resuelto_por INTEGER REFERENCES empleados(id_empleado) ON DELETE SET NULL,
    observaciones_resolucion TEXT
);

CREATE INDEX IF NOT EXISTS idx_op_orden ON ordenes_pendientes(id_orden_servicio);
CREATE INDEX IF NOT EXISTS idx_op_cliente_estado ON ordenes_pendientes(id_cliente, estado);
CREATE INDEX IF NOT EXISTS idx_op_equipo_estado ON ordenes_pendientes(id_equipo, estado);
CREATE INDEX IF NOT EXISTS idx_op_orden_equipo ON ordenes_pendientes(id_orden_equipo);
CREATE INDEX IF NOT EXISTS idx_op_fecha_creacion ON ordenes_pendientes(fecha_creacion DESC);
