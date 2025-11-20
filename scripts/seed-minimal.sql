-- ========================================
-- SEED TESTING MINIMAL - SQL DIRECTO
-- ========================================
-- Datos mínimos desbloquear testing FASE 4.6-4.9
-- Ejecutar: psql <connection-string> -f seed-minimal.sql

-- PASO 1: Estados cotización (6 registros)
INSERT INTO estados_cotizacion (codigo_estado, nombre_estado, descripcion, orden_visualizacion, color_hex, permite_edicion, requiere_aprobacion_interna, es_estado_final)
VALUES 
  ('BORRADOR', 'BORRADOR', 'Cotización en proceso de elaboración', 1, '#94A3B8', true, false, false),
  ('EN_REVISION', 'EN_REVISION', 'Esperando aprobación interna', 2, '#FBBF24', false, true, false),
  ('APROBADA_INTERNA', 'APROBADA_INTERNA', 'Aprobada internamente, lista para enviar', 3, '#34D399', false, false, false),
  ('ENVIADA', 'ENVIADA', 'Enviada al cliente', 4, '#60A5FA', false, false, false),
  ('APROBADA_CLIENTE', 'APROBADA_CLIENTE', 'Aprobada por el cliente', 5, '#10B981', false, false, true),
  ('RECHAZADA', 'RECHAZADA', 'Rechazada por el cliente', 6, '#EF4444', false, false, true)
ON CONFLICT (codigo_estado) DO NOTHING;

-- PASO 2: Tipo equipo MOTOR
INSERT INTO tipos_equipo (codigo_tipo, nombre_tipo, descripcion, categoria, tiene_motor, requiere_horometro, formato_ficha_tecnica)
VALUES ('MOTOR', 'MOTOR', 'Motor eléctrico industrial', 'ENERGIA', true, true, 'MOTOR_ELECTRICO')
ON CONFLICT (codigo_tipo) DO NOTHING;

-- PASO 3: Persona test (empresa jurídica)
INSERT INTO personas (tipo_persona, tipo_identificacion, numero_identificacion, razon_social, telefono_principal, email_principal, direccion_principal, ciudad, departamento, pais)
VALUES ('JURIDICA', 'NIT', '900123456-7', 'Empresa Test S.A.S', '3001234567', 'contacto@empresatest.com', 'Calle Test 123', 'Cartagena', 'Bolívar', 'Colombia')
ON CONFLICT (tipo_identificacion, numero_identificacion) DO NOTHING;

-- PASO 4: Cliente test
INSERT INTO clientes (id_persona, fecha_registro, estado_cliente, tipo_cliente, requiere_orden_compra, dias_credito)
SELECT id_persona, CURRENT_DATE, 'ACTIVO', 'CORPORATIVO', false, 30
FROM personas 
WHERE numero_identificacion = '900123456-7'
ON CONFLICT (id_persona) DO NOTHING;

-- PASO 5: Sede cliente test
INSERT INTO sedes_cliente (id_cliente, nombre_sede, direccion, ciudad, departamento, pais, es_sede_principal, telefono_contacto)
SELECT c.id_cliente, 'Sede Principal', 'Carrera 50 # 100-200', 'Cartagena', 'Bolívar', 'Colombia', true, '3001234567'
FROM clientes c
JOIN personas p ON c.id_persona = p.id_persona
WHERE p.numero_identificacion = '900123456-7'
AND NOT EXISTS (
  SELECT 1 FROM sedes_cliente sc WHERE sc.id_cliente = c.id_cliente AND sc.nombre_sede = 'Sede Principal'
);

-- PASO 6: Equipo motor test
INSERT INTO equipos (
  alias, id_tipo_equipo, id_cliente, id_sede, estado_equipo, 
  marca, modelo, numero_serie, potencia_nominal, 
  fecha_fabricacion, fecha_instalacion, ubicacion_fisica
)
SELECT 
  'MOTOR-TEST-001',
  te.id_tipo_equipo,
  c.id_cliente,
  sc.id_sede,
  'OPERATIVO',
  'WEG',
  'W22',
  'TEST-SN-001',
  100,
  '2020-01-01',
  '2020-06-15',
  'Área de pruebas'
FROM tipos_equipo te
CROSS JOIN clientes c
JOIN personas p ON c.id_persona = p.id_persona
JOIN sedes_cliente sc ON sc.id_cliente = c.id_cliente
WHERE te.codigo_tipo = 'MOTOR'
  AND p.numero_identificacion = '900123456-7'
  AND sc.nombre_sede = 'Sede Principal'
  AND NOT EXISTS (SELECT 1 FROM equipos e WHERE e.alias = 'MOTOR-TEST-001');

-- Verificación datos insertados
SELECT 'Estados cotización:', COUNT(*) FROM estados_cotizacion;
SELECT 'Tipos equipo:', COUNT(*) FROM tipos_equipo WHERE codigo_tipo = 'MOTOR';
SELECT 'Personas:', COUNT(*) FROM personas WHERE numero_identificacion = '900123456-7';
SELECT 'Clientes:', COUNT(*) FROM clientes c JOIN personas p ON c.id_persona = p.id_persona WHERE p.numero_identificacion = '900123456-7';
SELECT 'Sedes:', COUNT(*) FROM sedes_cliente sc JOIN clientes c ON sc.id_cliente = c.id_cliente JOIN personas p ON c.id_persona = p.id_persona WHERE p.numero_identificacion = '900123456-7';
SELECT 'Equipos:', COUNT(*) FROM equipos WHERE alias = 'MOTOR-TEST-001';
