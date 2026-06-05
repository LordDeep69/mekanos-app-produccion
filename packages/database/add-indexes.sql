-- ═══════════════════════════════════════════════════════════════════════════════
-- Add Indexes for Informes Module Performance Optimization
-- Date: 2026-06-05
-- ═══════════════════════════════════════════════════════════════════════════════

-- Index 1: documentos_generados - Filter by tipo_documento and sort by fecha_generacion
-- This is critical for the reportes query that filters by INFORME_SERVICIO
CREATE INDEX IF NOT EXISTS idx_documentos_generados_tipo_fecha 
ON documentos_generados (tipo_documento, fecha_generacion DESC);

-- Index 2: ordenes_servicio - Filter by cliente and tipo_servicio
-- Used in the reportes join condition
CREATE INDEX IF NOT EXISTS idx_ordenes_servicio_cliente_tipo 
ON ordenes_servicio (id_cliente, id_tipo_servicio);

-- Index 3: ordenes_servicio - Filter by sede
-- Used for sede filtering in reportes
CREATE INDEX IF NOT EXISTS idx_ordenes_servicio_sede 
ON ordenes_servicio (id_sede);

-- Index 4: informes - Link documento to informe
-- Used to check if informe exists
CREATE INDEX IF NOT EXISTS idx_informes_documento_pdf 
ON informes (id_documento_pdf);

-- Index 5: sedes_cliente - Look up sede by id
CREATE INDEX IF NOT EXISTS idx_sedes_cliente_id 
ON sedes_cliente (id_sede);

-- Index 6: documentos_generados - Look up by id_referencia (ordenes_servicio)
CREATE INDEX IF NOT EXISTS idx_documentos_generados_referencia 
ON documentos_generados (id_referencia, tipo_documento);

-- Analysis queries to help identify missing indexes in the future:
-- SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public';
-- EXPLAIN ANALYZE SELECT ... FROM documentos_generados WHERE tipo_documento = 'INFORME_SERVICIO' ...
