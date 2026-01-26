/**
 * Script para eliminar duplicados de la orden 640
 * Ejecuta SQL directamente en Supabase
 */

const { Client } = require('pg');

const DATABASE_URL = "postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";

async function ejecutarFix() {
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ Conectado a Supabase');

        // PASO 1: Ver estado ANTES
        console.log('\n📊 ESTADO ANTES:');
        const antes = await client.query(`
            SELECT 'Actividades' as tipo, COUNT(*) as total 
            FROM actividades_ejecutadas 
            WHERE id_orden_servicio = 640
            UNION ALL
            SELECT 'Mediciones', COUNT(*) 
            FROM mediciones_servicio 
            WHERE id_orden_servicio = 640
        `);
        console.table(antes.rows);

        // PASO 2: Eliminar duplicados de ACTIVIDADES
        console.log('\n🗑️  Eliminando duplicados de actividades...');
        const deleteActividades = await client.query(`
            DELETE FROM actividades_ejecutadas a
            WHERE a.id_actividad_ejecutada NOT IN (
                SELECT MIN(id_actividad_ejecutada)
                FROM actividades_ejecutadas
                WHERE id_orden_servicio = 640
                GROUP BY 
                    COALESCE(id_actividad_catalogo, -1),
                    COALESCE(descripcion_manual, ''),
                    sistema,
                    estado
            )
            AND a.id_orden_servicio = 640
        `);
        console.log(`   ✓ ${deleteActividades.rowCount} actividades duplicadas eliminadas`);

        // PASO 3: Eliminar duplicados de MEDICIONES
        console.log('\n🗑️  Eliminando duplicados de mediciones...');
        const deleteMediciones = await client.query(`
            DELETE FROM mediciones_servicio m
            WHERE m.id_medicion NOT IN (
                SELECT MIN(id_medicion)
                FROM mediciones_servicio
                WHERE id_orden_servicio = 640
                GROUP BY 
                    id_parametro_medicion,
                    valor_numerico
            )
            AND m.id_orden_servicio = 640
        `);
        console.log(`   ✓ ${deleteMediciones.rowCount} mediciones duplicadas eliminadas`);

        // PASO 4: Ver estado DESPUÉS
        console.log('\n📊 ESTADO DESPUÉS:');
        const despues = await client.query(`
            SELECT 'Actividades' as tipo, COUNT(*) as total 
            FROM actividades_ejecutadas 
            WHERE id_orden_servicio = 640
            UNION ALL
            SELECT 'Mediciones', COUNT(*) 
            FROM mediciones_servicio 
            WHERE id_orden_servicio = 640
        `);
        console.table(despues.rows);

        console.log('\n✅ FIX COMPLETADO');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

ejecutarFix().catch(console.error);
