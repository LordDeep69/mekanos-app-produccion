-- ============================================================================
-- MIGRACIÓN: Agregar GENERAL a tipo_evidencia_enum
-- Fecha: 07-FEB-2026
-- Descripción: Agrega el valor 'GENERAL' al enum tipo_evidencia_enum
--              para soportar fotos generales del servicio desde mobile.
--              El Prisma schema ya lo tiene, pero la BD real no fue migrada.
-- ============================================================================

-- Agregar GENERAL al enum (idempotente: no falla si ya existe)
DO $$
BEGIN
    -- Verificar si el valor ya existe en el enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'GENERAL' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_evidencia_enum')
    ) THEN
        ALTER TYPE tipo_evidencia_enum ADD VALUE 'GENERAL';
        RAISE NOTICE 'GENERAL agregado a tipo_evidencia_enum exitosamente';
    ELSE
        RAISE NOTICE 'GENERAL ya existe en tipo_evidencia_enum, no se requiere cambio';
    END IF;
END
$$;

-- Verificar que el valor fue agregado
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tipo_evidencia_enum')
ORDER BY enumsortorder;
