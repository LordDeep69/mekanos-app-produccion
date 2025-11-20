-- ============================================
-- SEEDS DATOS DEMO - CLIENTES Y EMPLEADOS
-- ============================================
-- Autor: GitHub Copilot
-- Fecha: 14 Nov 2025
-- Propósito: Datos mínimos para testing Cotizaciones
-- ============================================

-- ============================================
-- 1. PERSONAS BASE
-- ============================================
INSERT INTO personas (
  id_persona,
  tipo_documento,
  numero_documento,
  nombre_completo,
  telefono_principal,
  email,
  activo
) VALUES
  -- Cliente 1
  (1, 'NIT', '900123456-1', 'HOTEL CARIBE S.A.S.', '3001234567', 'gerencia@hotelcaribe.com', true),
  -- Cliente 2
  (2, 'NIT', '800987654-3', 'CLINICA BOCAGRANDE LTDA', '3109876543', 'admin@clinicabocagrande.com', true),
  -- Empleado 1 (Asesor)
  (3, 'CC', '1234567890', 'Juan Pérez Gómez', '3201234567', 'juan.perez@mekanos.com', true),
  -- Empleado 2 (Técnico)
  (4, 'CC', '9876543210', 'Carlos López Torres', '3109876543', 'carlos.lopez@mekanos.com', true)
ON CONFLICT (id_persona) DO NOTHING;

-- ============================================
-- 2. CLIENTES
-- ============================================
INSERT INTO clientes (
  id_cliente,
  id_persona,
  razon_social,
  nit,
  sector_economico,
  tipo_cliente,
  calificacion_crediticia,
  dias_credito,
  limite_credito,
  descuento_general_porcentaje,
  activo,
  creado_por
) VALUES
  (1, 1, 'HOTEL CARIBE S.A.S.', '900123456-1', 'HOTELERIA', 'CORPORATIVO', 'A', 30, 50000000, 5, true, 1),
  (2, 2, 'CLINICA BOCAGRANDE LTDA', '800987654-3', 'SALUD', 'CORPORATIVO', 'A+', 60, 100000000, 10, true, 1)
ON CONFLICT (id_cliente) DO NOTHING;

-- ============================================
-- 3. SEDES CLIENTES
-- ============================================
INSERT INTO sedes_cliente (
  id_sede,
  id_cliente,
  nombre_sede,
  direccion,
  ciudad,
  departamento,
  telefono,
  es_sede_principal,
  activo,
  creado_por
) VALUES
  (1, 1, 'Sede Principal - Hotel Caribe', 'Carrera 1 # 2-87, Bocagrande', 'Cartagena', 'Bolívar', '6651234', true, true, 1),
  (2, 2, 'Clínica Bocagrande - Torre A', 'Avenida San Martín # 7-123', 'Cartagena', 'Bolívar', '6659876', true, true, 1)
ON CONFLICT (id_sede) DO NOTHING;

-- ============================================
-- 4. EMPLEADOS
-- ============================================
INSERT INTO empleados (
  id_empleado,
  id_persona,
  codigo_empleado,
  cargo,
  tipo_contrato,
  fecha_ingreso,
  salario_base,
  disponible_campo,
  activo,
  creado_por
) VALUES
  (1, 3, 'MEK-001', 'ASESOR_COMERCIAL', 'INDEFINIDO', '2020-01-15', 2500000, false, true, 1),
  (2, 4, 'MEK-002', 'TECNICO_ELECTRICO', 'INDEFINIDO', '2019-06-01', 3000000, true, true, 1)
ON CONFLICT (id_empleado) DO NOTHING;

-- ============================================
-- 5. EQUIPOS DEMO
-- ============================================
INSERT INTO tipos_equipo (id_tipo_equipo, nombre, categoria, requiere_especificaciones) VALUES
  (1, 'GENERADOR_ELECTRICO', 'ENERGIA', true),
  (2, 'MOTOBOMBA', 'HIDRAULICO', true)
ON CONFLICT (id_tipo_equipo) DO NOTHING;

INSERT INTO equipos (
  id_equipo,
  id_cliente,
  id_sede,
  id_tipo_equipo,
  codigo_interno,
  marca,
  modelo,
  numero_serie,
  capacidad_nominal,
  unidad_medida,
  anio_fabricacion,
  ubicacion_fisica,
  estado_operativo,
  activo,
  creado_por
) VALUES
  (1, 1, 1, 1, 'GEN-HC-001', 'CATERPILLAR', 'C18', 'CAT12345XYZ', 500, 'kVA', 2018, 'Cuarto máquinas sótano 1', 'OPERATIVO', true, 1),
  (2, 2, 2, 2, 'BMB-CB-001', 'FLOWSERVE', 'D-3000', 'FLS98765ABC', 3000, 'GPM', 2020, 'Tanque principal agua', 'OPERATIVO', true, 1)
ON CONFLICT (id_equipo) DO NOTHING;

-- ============================================
-- 6. ESTADOS COTIZACIÓN
-- ============================================
INSERT INTO estados_cotizacion (id_estado, nombre, color_hex, permite_edicion, requiere_aprobacion) VALUES
  (1, 'BORRADOR', '#9CA3AF', true, false),
  (2, 'ENVIADA', '#3B82F6', false, true),
  (3, 'APROBADA', '#10B981', false, false),
  (4, 'RECHAZADA', '#EF4444', false, false),
  (5, 'VENCIDA', '#F59E0B', false, false),
  (6, 'CONVERTIDA_OS', '#8B5CF6', false, false)
ON CONFLICT (id_estado) DO NOTHING;

-- ============================================
-- VERIFICACIÓN SEEDS
-- ============================================
SELECT 
  'CLIENTES' as tabla, 
  COUNT(*) as registros 
FROM clientes
UNION ALL
SELECT 'EMPLEADOS', COUNT(*) FROM empleados
UNION ALL
SELECT 'EQUIPOS', COUNT(*) FROM equipos
UNION ALL
SELECT 'ESTADOS_COTIZACION', COUNT(*) FROM estados_cotizacion;

-- ============================================
-- FIN SEEDS
-- ============================================
