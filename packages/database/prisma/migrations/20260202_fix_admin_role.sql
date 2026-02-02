-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Asignar rol ADMIN al usuario admin@mekanos.com
-- Fecha: 02-FEB-2026
-- Problema: El usuario admin no tenía el rol ADMIN asignado en usuarios_roles
--           lo que causaba que esAdmin = false y no pudiera ver clientes
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Verificar que existe el rol ADMIN
DO $$
DECLARE
    v_id_rol INTEGER;
    v_id_usuario INTEGER;
BEGIN
    -- Buscar rol ADMIN
    SELECT id_rol INTO v_id_rol FROM roles WHERE codigo_rol = 'ADMIN';
    
    IF v_id_rol IS NULL THEN
        RAISE EXCEPTION '❌ Rol ADMIN no existe. Ejecutar seed-roles.ts primero';
    END IF;
    
    RAISE NOTICE '✅ Rol ADMIN encontrado (ID: %)', v_id_rol;
    
    -- Buscar usuario admin@mekanos.com
    SELECT id_usuario INTO v_id_usuario FROM usuarios WHERE email = 'admin@mekanos.com';
    
    IF v_id_usuario IS NULL THEN
        RAISE EXCEPTION '❌ Usuario admin@mekanos.com no existe';
    END IF;
    
    RAISE NOTICE '✅ Usuario admin@mekanos.com encontrado (ID: %)', v_id_usuario;
END $$;

-- 2. Insertar relación usuarios_roles (si no existe)
INSERT INTO usuarios_roles (id_usuario, id_rol, asignado_por, fecha_asignacion, activo)
SELECT 
    u.id_usuario,
    r.id_rol,
    u.id_usuario, -- Se asigna a sí mismo (o usar otro admin)
    NOW(),
    true
FROM usuarios u
CROSS JOIN roles r
WHERE u.email = 'admin@mekanos.com'
  AND r.codigo_rol = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_roles ur 
    WHERE ur.id_usuario = u.id_usuario 
      AND ur.id_rol = r.id_rol
  );

-- 3. Verificar asignación
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM usuarios_roles ur
    JOIN usuarios u ON ur.id_usuario = u.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.email = 'admin@mekanos.com'
      AND r.codigo_rol = 'ADMIN';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ Rol ADMIN asignado correctamente a admin@mekanos.com';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo asignar el rol ADMIN';
    END IF;
END $$;

-- 4. También asignar GERENTE y SUPERVISOR para máxima jerarquía (opcional pero recomendado)
INSERT INTO usuarios_roles (id_usuario, id_rol, asignado_por, fecha_asignacion, activo)
SELECT 
    u.id_usuario,
    r.id_rol,
    u.id_usuario,
    NOW(),
    true
FROM usuarios u
CROSS JOIN roles r
WHERE u.email = 'admin@mekanos.com'
  AND r.codigo_rol IN ('GERENTE', 'SUPERVISOR')
  AND NOT EXISTS (
    SELECT 1 FROM usuarios_roles ur 
    WHERE ur.id_usuario = u.id_usuario 
      AND ur.id_rol = r.id_rol
  );

-- 5. Mostrar roles finales del usuario
DO $$
DECLARE
    v_roles TEXT;
BEGIN
    SELECT string_agg(r.codigo_rol, ', ') INTO v_roles
    FROM usuarios_roles ur
    JOIN usuarios u ON ur.id_usuario = u.id_usuario
    JOIN roles r ON ur.id_rol = r.id_rol
    WHERE u.email = 'admin@mekanos.com'
      AND ur.activo = true;
    
    RAISE NOTICE '📋 Roles asignados a admin@mekanos.com: %', v_roles;
END $$;
