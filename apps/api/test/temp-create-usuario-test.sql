-- Eliminar usuario test existente (idempotente)
DELETE FROM usuarios WHERE email = 'test@mekanos.com';
DELETE FROM personas WHERE numero_identificacion = '1234567890' AND tipo_identificacion = 'CC';

-- Insertar persona NATURAL test
INSERT INTO personas (
    tipo_identificacion,
    numero_identificacion,
    tipo_persona,
    primer_nombre,
    primer_apellido,
    email_principal,
    telefono_principal,
    celular,
    direccion_principal,
    ciudad,
    departamento,
    pais,
    es_empleado,
    activo
) VALUES (
    'CC',
    '1234567890',
    'NATURAL',
    'Usuario',
    'Test',
    'test@mekanos.com',
    '3001234567',
    '3001234567',
    'Calle Test 123',
    'CARTAGENA',
    'BOLÃVAR',
    'COLOMBIA',
    true,
    true
) RETURNING id_persona;

-- Insertar usuario test (password: Test123456)
-- Hash BCrypt generado: .K5X6Z5X6Z5X6Z5X6Z5X6Z5X6Z5X6Z5e
INSERT INTO usuarios (
    id_persona,
    username,
    email,
    password_hash,
    debe_cambiar_password,
    estado
) VALUES (
    (SELECT id_persona FROM personas WHERE numero_identificacion = '1234567890' AND tipo_identificacion = 'CC'),
    'test_user',
    'test@mekanos.com',
    '\\\',
    false,
    'ACTIVO'
);

SELECT 
    u.id_usuario,
    u.username,
    u.email,
    p.primer_nombre,
    p.primer_apellido
FROM usuarios u
JOIN personas p ON u.id_persona = p.id_persona
WHERE u.email = 'test@mekanos.com';
