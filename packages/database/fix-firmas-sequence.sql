-- Fix para secuencia de firmas_administrativas
-- Ejecutar este script en Railway/Supabase

-- 1. Crear la secuencia si no existe
CREATE SEQUENCE IF NOT EXISTS firmas_administrativas_id_firma_administrativa_seq;

-- 2. Obtener el máximo ID actual y configurar la secuencia
SELECT setval('firmas_administrativas_id_firma_administrativa_seq', 
    COALESCE((SELECT MAX(id_firma_administrativa) FROM firmas_administrativas), 0) + 1, 
    false);

-- 3. Asignar la secuencia como default al campo
ALTER TABLE firmas_administrativas 
    ALTER COLUMN id_firma_administrativa 
    SET DEFAULT nextval('firmas_administrativas_id_firma_administrativa_seq');

-- 4. Asignar la secuencia a la columna (ownership)
ALTER SEQUENCE firmas_administrativas_id_firma_administrativa_seq 
    OWNED BY firmas_administrativas.id_firma_administrativa;

-- Verificar que todo está correcto
SELECT 
    column_name, 
    column_default, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'firmas_administrativas' 
    AND column_name = 'id_firma_administrativa';
