-- =============================================
-- MIGRACIÓN: Agregar emails_notificacion a clientes
-- =============================================
-- Fecha: 24-FEB-2026
-- Propósito: Permitir múltiples correos de notificación por cliente
-- Estrategia: Campo TEXT con emails separados por ';;'
-- Ejemplo: 'admin@empresa.com;;contabilidad@empresa.com;;gerencia@empresa.com'
-- =============================================

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS emails_notificacion TEXT DEFAULT NULL;

COMMENT ON COLUMN clientes.emails_notificacion IS 
'Correos adicionales de notificación separados por ;; - Se enviarán emails a TODOS estos correos más el email_principal de la persona';
