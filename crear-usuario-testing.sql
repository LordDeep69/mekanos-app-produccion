-- Script urgente: Crear usuario ID=1 para testing
-- Este usuario es necesario para las FK de creado_por

INSERT INTO personas (
  id_persona,
  tipo_persona,
  tipo_documento,
  numero_documento,
  nombres,
  apellidos,
  email_principal,
  telefono_principal,
  activo,
  fecha_creacion
) VALUES (
  1,
  'NATURAL',
  'CC',
  '1000000000',
  'Sistema',
  'Admin',
  'admin@mekanos.com',
  '3000000000',
  true,
  NOW()
) ON CONFLICT (id_persona) DO NOTHING;

INSERT INTO usuarios (
  id_usuario,
  id_persona,
  nombre_usuario,
  contrasena_hash,
  estado_usuario,
  requiere_cambio_contrasena,
  intentos_fallidos_login,
  bloqueado_hasta,
  ultimo_acceso,
  activo,
  fecha_creacion
) VALUES (
  1,
  1,
  'admin',
  '$2b$10$abcdefghijklmnopqrstuv', -- hash dummy
  'ACTIVO',
  false,
  0,
  NULL,
  NULL,
  true,
  NOW()
) ON CONFLICT (id_usuario) DO NOTHING;
