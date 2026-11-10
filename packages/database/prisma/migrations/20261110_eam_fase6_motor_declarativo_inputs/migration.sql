-- Fase 6: Motor declarativo universal de naturalezas e inputs
ALTER TABLE catalogo_actividades
  ADD COLUMN IF NOT EXISTS naturaleza_personalizada VARCHAR(80),
  ADD COLUMN IF NOT EXISTS tipo_control_input VARCHAR(40) NOT NULL DEFAULT 'ESCALA_ESTADO',
  ADD COLUMN IF NOT EXISTS config_input_json JSONB,
  ADD COLUMN IF NOT EXISTS rol_semantico VARCHAR(50);

ALTER TABLE actividades_ejecutadas
  ADD COLUMN IF NOT EXISTS respuesta_json JSONB;
