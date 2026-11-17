-- ============================================================================
-- Crear tabla ordenes_actividades_plan si no existe
-- ============================================================================

-- Verificar y crear ENUM si no existe
DO $$ BEGIN
    CREATE TYPE origen_actividad_plan_enum AS ENUM ('ADMIN', 'TECNICO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla
CREATE TABLE IF NOT EXISTS ordenes_actividades_plan (
    id_orden_actividad_plan SERIAL PRIMARY KEY,
    id_orden_servicio       INTEGER NOT NULL,
    id_actividad_catalogo   INTEGER NOT NULL,
    orden_secuencia         INTEGER DEFAULT 1,
    origen                  origen_actividad_plan_enum DEFAULT 'ADMIN',
    es_obligatoria          BOOLEAN DEFAULT TRUE,
    creado_por              INTEGER,
    fecha_creacion          TIMESTAMP(6) DEFAULT NOW(),
    modificado_por          INTEGER,
    fecha_modificacion      TIMESTAMP(6),
    
    -- Constraints
    CONSTRAINT fk_plan_orden 
        FOREIGN KEY (id_orden_servicio) 
        REFERENCES ordenes_servicio(id_orden_servicio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_plan_actividad 
        FOREIGN KEY (id_actividad_catalogo) 
        REFERENCES catalogo_actividades(id_actividad_catalogo) 
        ON DELETE RESTRICT,
    CONSTRAINT uk_plan_orden_actividad 
        UNIQUE (id_orden_servicio, id_actividad_catalogo)
);

-- Índice para consulta frecuente (ordenar por secuencia)
CREATE INDEX IF NOT EXISTS idx_plan_orden_secuencia 
    ON ordenes_actividades_plan(id_orden_servicio, orden_secuencia);

-- Comentarios
COMMENT ON TABLE ordenes_actividades_plan IS 
'Plan de actividades asignadas por Admin a una orden específica. Para correctivos.';

COMMENT ON COLUMN ordenes_actividades_plan.origen IS 
'ADMIN = Asignada por portal admin, TECNICO = Agregada por técnico en campo';
