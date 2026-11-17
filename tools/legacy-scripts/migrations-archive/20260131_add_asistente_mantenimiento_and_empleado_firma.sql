-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Agregar ASISTENTE_MANTENIMIENTO y campo empleado en firmas
-- Fecha: 31-ENE-2026
-- Autor: Sistema Multi-Asesor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar ASISTENTE_MANTENIMIENTO al enum cargo_empleado_enum
ALTER TYPE cargo_empleado_enum ADD VALUE IF NOT EXISTS 'ASISTENTE_MANTENIMIENTO';

-- 2. Agregar campo id_empleado_asignado a firmas_administrativas
ALTER TABLE firmas_administrativas 
ADD COLUMN IF NOT EXISTS id_empleado_asignado INTEGER;

-- 3. Crear foreign key hacia empleados
ALTER TABLE firmas_administrativas
ADD CONSTRAINT fk_firma_empleado_asignado 
FOREIGN KEY (id_empleado_asignado) 
REFERENCES empleados(id_empleado) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 4. Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_firmas_empleado_asignado 
ON firmas_administrativas(id_empleado_asignado);

-- 5. Comentarios para documentación
COMMENT ON COLUMN firmas_administrativas.id_empleado_asignado IS 
'Empleado (asesor/asistente) asignado a esta firma administrativa. Los clientes de esta firma heredan automáticamente este empleado como id_asesor_asignado.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FUNCIÓN: Propagación automática de empleado asignado
-- Cuando se asigna un empleado a una firma, todos sus clientes lo heredan
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION propagar_empleado_firma_a_clientes()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo propagar si cambió el id_empleado_asignado
  IF (TG_OP = 'UPDATE' AND OLD.id_empleado_asignado IS DISTINCT FROM NEW.id_empleado_asignado) 
     OR (TG_OP = 'INSERT' AND NEW.id_empleado_asignado IS NOT NULL) THEN
    
    -- Actualizar todos los clientes de esta firma
    UPDATE clientes
    SET id_asesor_asignado = NEW.id_empleado_asignado,
        fecha_modificacion = NOW()
    WHERE id_firma_administrativa = NEW.id_firma_administrativa;
    
    -- Log de cuántos clientes fueron actualizados
    RAISE NOTICE 'Propagación automática: % clientes actualizados con empleado %', 
                 (SELECT COUNT(*) FROM clientes WHERE id_firma_administrativa = NEW.id_firma_administrativa),
                 NEW.id_empleado_asignado;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_propagar_empleado_firma ON firmas_administrativas;
CREATE TRIGGER trigger_propagar_empleado_firma
AFTER INSERT OR UPDATE OF id_empleado_asignado ON firmas_administrativas
FOR EACH ROW
EXECUTE FUNCTION propagar_empleado_firma_a_clientes();

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ═══════════════════════════════════════════════════════════════════════════════

-- Verificar que el enum se actualizó
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ASISTENTE_MANTENIMIENTO' 
    AND enumtypid = 'cargo_empleado_enum'::regtype
  ) THEN
    RAISE NOTICE '✅ ASISTENTE_MANTENIMIENTO agregado correctamente al enum';
  ELSE
    RAISE EXCEPTION '❌ Error: ASISTENTE_MANTENIMIENTO no se agregó al enum';
  END IF;
END $$;

-- Verificar que la columna se creó
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'firmas_administrativas' 
    AND column_name = 'id_empleado_asignado'
  ) THEN
    RAISE NOTICE '✅ Campo id_empleado_asignado creado correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Campo id_empleado_asignado no se creó';
  END IF;
END $$;

-- Verificar que el trigger se creó
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_propagar_empleado_firma'
  ) THEN
    RAISE NOTICE '✅ Trigger de propagación automática creado correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Trigger no se creó';
  END IF;
END $$;
