-- ============================================================================
-- SEED: Insertar las 3 cuentas de email configuradas con OAuth2
-- Fecha: 2026-02-05
-- IMPORTANTE: Ejecutar DESPUÉS de la migración 001_crear_tabla_cuentas_email.sql
-- ============================================================================

-- Limpiar datos existentes (opcional, comentar si no deseas limpiar)
-- DELETE FROM cuentas_email;

-- Insertar las 3 cuentas de email con sus credenciales OAuth2
INSERT INTO cuentas_email (
    nombre,
    email,
    gmail_client_id,
    gmail_client_secret,
    gmail_refresh_token,
    es_cuenta_principal,
    activa,
    descripcion
) VALUES 
-- Cuenta 1: Principal (mekanossas4@gmail.com)
(
    'Mekanos Principal',
    'mekanossas4@gmail.com',
    'YOUR_CLIENT_ID_HERE',  -- Reemplazar con gmail_client_id real
    'YOUR_CLIENT_SECRET_HERE',  -- Reemplazar con gmail_client_secret real
    'YOUR_REFRESH_TOKEN_HERE',  -- Reemplazar con gmail_refresh_token real
    TRUE,  -- Esta es la cuenta principal
    TRUE,
    'Cuenta principal de Mekanos S.A.S para envío de informes técnicos'
),
-- Cuenta 2: Ventas (mekanossas2@gmail.com)
(
    'Mekanos Ventas',
    'mekanossas2@gmail.com',
    'YOUR_CLIENT_ID_HERE',  -- Reemplazar con gmail_client_id real
    'YOUR_CLIENT_SECRET_HERE',  -- Reemplazar con gmail_client_secret real
    'YOUR_REFRESH_TOKEN_HERE',  -- Reemplazar con gmail_refresh_token real
    FALSE,
    TRUE,
    'Cuenta de ventas para comunicaciones comerciales'
),
-- Cuenta 3: Contabilidad (auxiliarcontablemekano@gmail.com)
(
    'Auxiliar Contable',
    'auxiliarcontablemekano@gmail.com',
    'YOUR_CLIENT_ID_HERE',  -- Reemplazar con gmail_client_id real
    'YOUR_CLIENT_SECRET_HERE',  -- Reemplazar con gmail_client_secret real
    'YOUR_REFRESH_TOKEN_HERE',  -- Reemplazar con gmail_refresh_token real
    FALSE,
    TRUE,
    'Cuenta del área contable para documentos financieros'
)
ON CONFLICT (email) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    gmail_client_id = EXCLUDED.gmail_client_id,
    gmail_client_secret = EXCLUDED.gmail_client_secret,
    gmail_refresh_token = EXCLUDED.gmail_refresh_token,
    es_cuenta_principal = EXCLUDED.es_cuenta_principal,
    activa = EXCLUDED.activa,
    descripcion = EXCLUDED.descripcion,
    fecha_modificacion = NOW();

-- Verificar inserción
SELECT 
    id_cuenta_email,
    nombre,
    email,
    es_cuenta_principal,
    activa,
    fecha_creacion
FROM cuentas_email
ORDER BY es_cuenta_principal DESC, id_cuenta_email;

-- ============================================================================
-- FIN DE SEED
-- ============================================================================
