-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar id_firma_tecnico a ordenes_servicio
-- Fecha: 05-ENE-2026
-- Problema: Las firmas del técnico se sobrescribían con cada orden nueva porque
--           se usaba upsert basado en (id_persona, tipo_firma). Esto causaba que
--           TODAS las órdenes mostraran la misma firma del técnico.
-- Solución: Agregar FK id_firma_tecnico para vincular firma específica a cada orden
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna id_firma_tecnico a ordenes_servicio
ALTER TABLE ordenes_servicio 
ADD COLUMN IF NOT EXISTS id_firma_tecnico INT;

-- 2. Crear FK constraint
ALTER TABLE ordenes_servicio
ADD CONSTRAINT fk_orden_firma_tecnico 
FOREIGN KEY (id_firma_tecnico) 
REFERENCES firmas_digitales(id_firma_digital) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 3. Crear índice para mejorar performance de queries
CREATE INDEX IF NOT EXISTS idx_ordenes_firma_tecnico 
ON ordenes_servicio(id_firma_tecnico);

-- 4. Comentario descriptivo
COMMENT ON COLUMN ordenes_servicio.id_firma_tecnico IS 
'FK a firmas_digitales - Firma específica del técnico para esta orden (evita mezclar firmas entre órdenes)';

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'ordenes_servicio' AND column_name = 'id_firma_tecnico';
