-- MEKANOS S.A.S - Migración: Agregar excluido_pdf a mediciones_servicio y actividades_ejecutadas
-- Permite al admin excluir items individuales del informe PDF
-- Fecha: 04-MAY-2026

ALTER TABLE mediciones_servicio ADD COLUMN IF NOT EXISTS excluido_pdf BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE actividades_ejecutadas ADD COLUMN IF NOT EXISTS excluido_pdf BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN mediciones_servicio.excluido_pdf IS 'Si true, esta medición no se incluye en el informe PDF';
COMMENT ON COLUMN actividades_ejecutadas.excluido_pdf IS 'Si true, esta actividad no se incluye en el informe PDF';
