-- ============================================================================
-- MIGRACIÓN: Crear tabla cuentas_email para sistema multi-remitente
-- Fecha: 2026-02-05
-- Autor: Cascade AI
-- ============================================================================

-- 1. Crear la tabla cuentas_email
CREATE TABLE IF NOT EXISTS cuentas_email (
    id_cuenta_email SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    gmail_client_id TEXT NOT NULL,
    gmail_client_secret TEXT NOT NULL,
    gmail_refresh_token TEXT NOT NULL,
    es_cuenta_principal BOOLEAN DEFAULT FALSE,
    activa BOOLEAN DEFAULT TRUE,
    descripcion TEXT,
    fecha_creacion TIMESTAMP(6) DEFAULT NOW(),
    fecha_modificacion TIMESTAMP(6),
    creado_por INT REFERENCES usuarios(id_usuario),
    modificado_por INT REFERENCES usuarios(id_usuario)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_cuentas_email_activa ON cuentas_email(activa);
CREATE INDEX IF NOT EXISTS idx_cuentas_email_principal ON cuentas_email(es_cuenta_principal);

-- 3. Agregar columna id_cuenta_email_remitente a la tabla clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS id_cuenta_email_remitente INT 
REFERENCES cuentas_email(id_cuenta_email) ON DELETE SET NULL;

-- 4. Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_clientes_cuenta_email ON clientes(id_cuenta_email_remitente);

-- 5. Comentarios de documentación
COMMENT ON TABLE cuentas_email IS 'Tabla para gestionar múltiples cuentas de email remitentes con credenciales OAuth2 de Gmail API';
COMMENT ON COLUMN cuentas_email.gmail_client_id IS 'OAuth2 Client ID de Google Cloud Console';
COMMENT ON COLUMN cuentas_email.gmail_client_secret IS 'OAuth2 Client Secret de Google Cloud Console';
COMMENT ON COLUMN cuentas_email.gmail_refresh_token IS 'Refresh Token obtenido via OAuth2 Playground';
COMMENT ON COLUMN cuentas_email.es_cuenta_principal IS 'Si es TRUE, esta cuenta se usa por defecto cuando un cliente no tiene cuenta asignada';
COMMENT ON COLUMN clientes.id_cuenta_email_remitente IS 'Cuenta de email desde la cual se enviarán los correos a este cliente';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
