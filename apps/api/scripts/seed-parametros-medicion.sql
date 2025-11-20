/**
 * FASE 4.2 - Seeds Parámetros de Medición para Testing
 * 
 * Crear parámetro VOLTAJE_TRIFASICO con rangos conocidos:
 * - Normal: 210-230V
 * - Crítico: 200-250V
 * 
 * EJECUTAR:
 * 1. Login: POST http://localhost:3000/api/auth/login
 *    Body: { "email": "admin@mekanos.com", "password": "Admin123!" }
 *    → Copiar accessToken
 * 
 * 2. Crear parámetro (Headers: Authorization: Bearer <token>):
 *    POST http://localhost:3000/api/parametros-medicion (si existe endpoint)
 *    O ejecutar SQL directo en Supabase:
 */

-- SEED PARÁMETRO VOLTAJE TRIFÁSICO
INSERT INTO parametros_medicion (
  nombre_parametro,
  unidad_medida,
  tipo_dato,
  categoria,
  valor_minimo_normal,
  valor_maximo_normal,
  valor_minimo_critico,
  valor_maximo_critico,
  valor_ideal,
  decimales_precision,
  es_critico_seguridad,
  es_obligatorio,
  descripcion,
  creado_por
) VALUES (
  'VOLTAJE_TRIFASICO',
  'V',
  'NUMERICO',
  'ELECTRICO',
  210.00, -- Normal mínimo
  230.00, -- Normal máximo
  200.00, -- Crítico mínimo
  250.00, -- Crítico máximo
  220.00, -- Ideal
  2,      -- Decimales
  true,   -- Crítico seguridad
  true,   -- Obligatorio
  'Voltaje trifásico en generador - rango seguro 210-230V, crítico 200-250V',
  1       -- Usuario admin (ajustar según id_usuario real)
) RETURNING id_parametro_medicion;

-- SEED PARÁMETRO TEMPERATURA BOBINADO (para test advertencia)
INSERT INTO parametros_medicion (
  nombre_parametro,
  unidad_medida,
  tipo_dato,
  categoria,
  valor_minimo_normal,
  valor_maximo_normal,
  valor_minimo_critico,
  valor_maximo_critico,
  valor_ideal,
  decimales_precision,
  es_critico_seguridad,
  es_obligatorio,
  descripcion,
  creado_por
) VALUES (
  'TEMPERATURA_BOBINADO',
  '°C',
  'NUMERICO',
  'TERMICO',
  40.00,  -- Normal mínimo
  80.00,  -- Normal máximo
  0.00,   -- Crítico mínimo
  120.00, -- Crítico máximo
  60.00,  -- Ideal
  2,
  true,
  true,
  'Temperatura bobinado motor - rango normal 40-80°C, crítico 0-120°C',
  1
) RETURNING id_parametro_medicion;

-- SEED PARÁMETRO ESTADO VISUAL (tipo texto - nivel INFORMATIVO)
INSERT INTO parametros_medicion (
  nombre_parametro,
  unidad_medida,
  tipo_dato,
  categoria,
  valor_minimo_normal,
  valor_maximo_normal,
  valor_minimo_critico,
  valor_maximo_critico,
  decimales_precision,
  es_critico_seguridad,
  es_obligatorio,
  descripcion,
  creado_por
) VALUES (
  'ESTADO_VISUAL_GENERAL',
  NULL,
  'TEXTO',
  'INSPECCION',
  NULL, -- Sin rangos (tipo texto)
  NULL,
  NULL,
  NULL,
  0,
  false,
  false,
  'Inspección visual general del equipo',
  1
) RETURNING id_parametro_medicion;

/**
 * RESULTADO ESPERADO:
 * - 3 parámetros creados con IDs (ej: 1, 2, 3)
 * - Guardar IDs para usar en tests curl
 */
