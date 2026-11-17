-- ════════════════════════════════════════════════════════════════════════════════
-- MEKANOS S.A.S - MIGRACIÓN MANUAL: MULTIEQUIPOS POR ORDEN
-- ════════════════════════════════════════════════════════════════════════════════
-- Versión: 1.0.0
-- Fecha: 15 de Diciembre de 2025
-- Descripción: Soporte para órdenes de servicio con múltiples equipos
-- Backward Compatible: SÍ - No rompe órdenes existentes
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌────────────────────────────────────────────────────────────────────────────────┐
-- │ PASO 1: CREAR TABLA ORDENES_EQUIPOS                                           │
-- │ Tabla intermedia para relación N:M entre ordenes_servicio y equipos           │
-- └────────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS ordenes_equipos (
    -- ══════════════════════════════════════════════════════════════════════════
    -- IDENTIFICACIÓN
    -- ══════════════════════════════════════════════════════════════════════════
    id_orden_equipo       SERIAL PRIMARY KEY,
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- RELACIONES
    -- ══════════════════════════════════════════════════════════════════════════
    id_orden_servicio     INTEGER NOT NULL REFERENCES ordenes_servicio(id_orden_servicio) ON DELETE CASCADE,
    id_equipo             INTEGER NOT NULL REFERENCES equipos(id_equipo) ON DELETE RESTRICT,
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- SECUENCIA Y ORGANIZACIÓN
    -- ══════════════════════════════════════════════════════════════════════════
    orden_secuencia       INTEGER NOT NULL DEFAULT 1,
    nombre_sistema        VARCHAR(200),  -- Ej: "Sistema Contraincendios", "Sistema Hidroflo"
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- ESTADO DE EJECUCIÓN POR EQUIPO
    -- ══════════════════════════════════════════════════════════════════════════
    estado                estado_detalle_servicio_enum DEFAULT 'PENDIENTE',
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- TIEMPOS POR EQUIPO
    -- ══════════════════════════════════════════════════════════════════════════
    fecha_inicio          TIMESTAMP,
    fecha_fin             TIMESTAMP,
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- OBSERVACIONES Y METADATA
    -- ══════════════════════════════════════════════════════════════════════════
    observaciones         TEXT,
    metadata              JSONB DEFAULT '{}',
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- AUDITORÍA
    -- ══════════════════════════════════════════════════════════════════════════
    creado_por            INTEGER REFERENCES usuarios(id_usuario),
    fecha_creacion        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modificado_por        INTEGER REFERENCES usuarios(id_usuario),
    fecha_modificacion    TIMESTAMP,
    
    -- ══════════════════════════════════════════════════════════════════════════
    -- CONSTRAINTS
    -- ══════════════════════════════════════════════════════════════════════════
    CONSTRAINT uk_orden_equipo UNIQUE (id_orden_servicio, id_equipo),
    CONSTRAINT chk_oe_fecha_fin_posterior
        CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

-- ┌────────────────────────────────────────────────────────────────────────────────┐
-- │ PASO 2: ÍNDICES OPTIMIZADOS                                                    │
-- └────────────────────────────────────────────────────────────────────────────────┘

-- Consulta: "Dame todos los equipos de esta orden"
CREATE INDEX IF NOT EXISTS idx_oe_orden ON ordenes_equipos(id_orden_servicio);

-- Consulta: "Dame todas las órdenes donde aparece este equipo"
CREATE INDEX IF NOT EXISTS idx_oe_equipo ON ordenes_equipos(id_equipo);

-- Consulta: "Equipos pendientes de esta orden"
CREATE INDEX IF NOT EXISTS idx_oe_orden_estado ON ordenes_equipos(id_orden_servicio, estado)
    WHERE estado != 'COMPLETADO';

-- Consulta: "Orden por secuencia"
CREATE INDEX IF NOT EXISTS idx_oe_orden_secuencia ON ordenes_equipos(id_orden_servicio, orden_secuencia);

-- ┌────────────────────────────────────────────────────────────────────────────────┐
-- │ PASO 3: COMENTARIOS DESCRIPTIVOS                                               │
-- └────────────────────────────────────────────────────────────────────────────────┘

COMMENT ON TABLE ordenes_equipos IS 
'Tabla intermedia para soportar múltiples equipos por orden de servicio.

ARQUITECTURA:
- ordenes_servicio.id_equipo → Equipo principal/legacy (backward compatible)
- ordenes_equipos[] → Lista de equipos adicionales (opcional)

REGLA DE NEGOCIO:
- Si ordenes_equipos está VACÍO → Orden tradicional con 1 equipo (usa id_equipo de ordenes_servicio)
- Si ordenes_equipos tiene registros → Orden multi-equipo (usa esta tabla)

CASOS DE USO:
- Sistema Contraincendios con 2 bombas
- Cuarto de máquinas con 3 generadores
- Hotel con múltiples sistemas de bombeo (Hidroflo, Sumergibles, etc.)

SINCRONIZACIÓN MOBILE:
- Backend envía array equiposOrden[] en sync download
- Mobile persiste en tabla local OrdenesEquipos (Drift)
- Cada equipo tiene su propio estado de ejecución';

COMMENT ON COLUMN ordenes_equipos.orden_secuencia IS 
'Orden de ejecución del equipo (1, 2, 3...). Define el orden sugerido para el técnico.';

COMMENT ON COLUMN ordenes_equipos.nombre_sistema IS 
'Nombre descriptivo del sistema al que pertenece el equipo. Ej: "Sistema Contraincendios", "Tanque Principal".
Útil para agrupar equipos en el PDF y en la UI.';

COMMENT ON COLUMN ordenes_equipos.estado IS 
'Estado de ejecución individual por equipo:
- PENDIENTE: No iniciado
- EN_PROCESO: Técnico está trabajando en este equipo
- COMPLETADO: Actividades, mediciones y fotos completadas
- CANCELADO: No se ejecutó por algún motivo';

-- ┌────────────────────────────────────────────────────────────────────────────────┐
-- │ PASO 4: TRIGGER TIMESTAMP                                                       │
-- └────────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION trg_timestamp_ordenes_equipos()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.fecha_modificacion := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ordenes_equipos_timestamp ON ordenes_equipos;
CREATE TRIGGER trg_ordenes_equipos_timestamp
    BEFORE UPDATE ON ordenes_equipos
    FOR EACH ROW EXECUTE FUNCTION trg_timestamp_ordenes_equipos();

-- ┌────────────────────────────────────────────────────────────────────────────────┐
-- │ PASO 5: MODIFICAR TABLAS DERIVADAS (FK OPCIONAL A ordenes_equipos)             │
-- └────────────────────────────────────────────────────────────────────────────────┘

-- IMPORTANTE: Las FK son opcionales (nullable) para mantener backward compatibility
-- Si id_orden_equipo es NULL → actividad/medición/evidencia aplica a orden completa
-- Si id_orden_equipo tiene valor → aplica solo a ese equipo específico

-- 5.1 Actividades ejecutadas por equipo específico
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actividades_ejecutadas' 
        AND column_name = 'id_orden_equipo'
    ) THEN
        ALTER TABLE actividades_ejecutadas 
            ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL;
        
        CREATE INDEX idx_ae_orden_equipo ON actividades_ejecutadas(id_orden_equipo) 
            WHERE id_orden_equipo IS NOT NULL;
            
        COMMENT ON COLUMN actividades_ejecutadas.id_orden_equipo IS 
        'FK opcional a ordenes_equipos. Si NULL, la actividad aplica a toda la orden.
        Si tiene valor, la actividad aplica solo a ese equipo específico.';
    END IF;
END $$;

-- 5.2 Mediciones de servicio por equipo específico
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mediciones_servicio' 
        AND column_name = 'id_orden_equipo'
    ) THEN
        ALTER TABLE mediciones_servicio 
            ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL;
        
        CREATE INDEX idx_ms_orden_equipo ON mediciones_servicio(id_orden_equipo) 
            WHERE id_orden_equipo IS NOT NULL;
            
        COMMENT ON COLUMN mediciones_servicio.id_orden_equipo IS 
        'FK opcional a ordenes_equipos. Si NULL, la medición aplica a toda la orden.
        Si tiene valor, la medición aplica solo a ese equipo específico (voltaje de bomba 1, etc.).';
    END IF;
END $$;

-- 5.3 Evidencias fotográficas por equipo específico
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evidencias_fotograficas' 
        AND column_name = 'id_orden_equipo'
    ) THEN
        ALTER TABLE evidencias_fotograficas 
            ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL;
        
        CREATE INDEX idx_ef_orden_equipo ON evidencias_fotograficas(id_orden_equipo) 
            WHERE id_orden_equipo IS NOT NULL;
            
        COMMENT ON COLUMN evidencias_fotograficas.id_orden_equipo IS 
        'FK opcional a ordenes_equipos. Si NULL, la foto aplica a toda la orden.
        Si tiene valor, la foto aplica solo a ese equipo específico (foto ANTES de bomba 1, etc.).';
    END IF;
END $$;

-- ┌────────────────────────────────────────────────────────────────────────────────┐
-- │ PASO 6: VALIDACIÓN POST-EJECUCIÓN                                              │
-- └────────────────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE
    v_tabla_existe BOOLEAN;
    v_col_ae_existe BOOLEAN;
    v_col_ms_existe BOOLEAN;
    v_col_ef_existe BOOLEAN;
BEGIN
    -- Verificar tabla ordenes_equipos
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ordenes_equipos'
    ) INTO v_tabla_existe;
    
    -- Verificar columnas FK en tablas derivadas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actividades_ejecutadas' AND column_name = 'id_orden_equipo'
    ) INTO v_col_ae_existe;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mediciones_servicio' AND column_name = 'id_orden_equipo'
    ) INTO v_col_ms_existe;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evidencias_fotograficas' AND column_name = 'id_orden_equipo'
    ) INTO v_col_ef_existe;
    
    -- Reporte
    RAISE NOTICE '════════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '✓✓✓ MIGRACIÓN MULTIEQUIPOS COMPLETADA ✓✓✓';
    RAISE NOTICE '════════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'TABLA ordenes_equipos: %', CASE WHEN v_tabla_existe THEN '✅ CREADA' ELSE '❌ ERROR' END;
    RAISE NOTICE '';
    RAISE NOTICE 'COLUMNAS FK agregadas:';
    RAISE NOTICE '  actividades_ejecutadas.id_orden_equipo: %', CASE WHEN v_col_ae_existe THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  mediciones_servicio.id_orden_equipo: %', CASE WHEN v_col_ms_existe THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  evidencias_fotograficas.id_orden_equipo: %', CASE WHEN v_col_ef_existe THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE 'SIGUIENTE PASO:';
    RAISE NOTICE '  1. Ejecutar: cd packages/database && npx prisma db pull';
    RAISE NOTICE '  2. Ejecutar: npx prisma generate';
    RAISE NOTICE '  3. Reiniciar backend para aplicar cambios';
    RAISE NOTICE '════════════════════════════════════════════════════════════════════════';
    
    IF NOT (v_tabla_existe AND v_col_ae_existe AND v_col_ms_existe AND v_col_ef_existe) THEN
        RAISE WARNING 'Algunos componentes no se crearon correctamente. Revise los errores anteriores.';
    END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRACIÓN
-- ════════════════════════════════════════════════════════════════════════════════
