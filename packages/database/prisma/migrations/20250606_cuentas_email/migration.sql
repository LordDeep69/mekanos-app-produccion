-- ============================================================================
-- MIGRACIÓN: Cuentas Email Multi-Remitente
-- Fecha: 2025-06-06
-- Descripción: Agrega soporte para múltiples cuentas de email remitente
-- ============================================================================

-- 1. Crear tabla cuentas_email
CREATE TABLE IF NOT EXISTS cuentas_email (
    id_cuenta_email SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    gmail_client_id TEXT NOT NULL,
    gmail_client_secret TEXT NOT NULL,
    gmail_refresh_token TEXT NOT NULL,
    es_principal BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    creado_por INTEGER REFERENCES usuarios(id_usuario),
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    modificado_por INTEGER REFERENCES usuarios(id_usuario),
    fecha_modificacion TIMESTAMP
);

-- 2. Crear índices
CREATE INDEX idx_cuentas_email_activa ON cuentas_email(activa);
CREATE INDEX idx_cuentas_email_principal ON cuentas_email(es_principal);

-- 3. Agregar columna id_cuenta_email_remitente a clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS id_cuenta_email_remitente INTEGER 
REFERENCES cuentas_email(id_cuenta_email) ON DELETE SET NULL;

-- 4. Crear índice para la FK
CREATE INDEX IF NOT EXISTS idx_clientes_cuenta_email ON clientes(id_cuenta_email_remitente);

-- 5. Comentarios de documentación
COMMENT ON TABLE cuentas_email IS 'Cuentas de email configuradas para envío de informes vía Gmail API';
COMMENT ON COLUMN cuentas_email.gmail_client_id IS 'OAuth2 Client ID de Google Cloud Console';
COMMENT ON COLUMN cuentas_email.gmail_client_secret IS 'OAuth2 Client Secret de Google Cloud Console';
COMMENT ON COLUMN cuentas_email.gmail_refresh_token IS 'Refresh Token obtenido del OAuth2 Playground';
COMMENT ON COLUMN cuentas_email.es_principal IS 'Si es la cuenta por defecto para envíos sin cuenta específica';
COMMENT ON COLUMN clientes.id_cuenta_email_remitente IS 'Cuenta de email desde la cual se enviarán los informes a este cliente';

-- ============================================================================
-- INSTRUCCIONES DE USO:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Luego ejecutar: npx prisma db pull (para actualizar el schema)
-- 3. Finalmente: npx prisma generate (para regenerar el cliente)
-- ============================================================================
