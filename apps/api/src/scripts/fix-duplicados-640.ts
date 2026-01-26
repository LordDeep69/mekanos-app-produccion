/**
 * Script para eliminar duplicados de la orden 640
 * Usa Prisma Client del proyecto
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ejecutarFix() {
    try {
        console.log('✅ Conectado a Supabase via Prisma');

        // PASO 1: Ver estado ANTES
        console.log('\n📊 ESTADO ANTES:');
        const antesActividades = await prisma.actividades_ejecutadas.count({
            where: { id_orden_servicio: 640 }
        });
        const antesMediciones = await prisma.mediciones_servicio.count({
            where: { id_orden_servicio: 640 }
        });
        console.log(`   Actividades: ${antesActividades}`);
        console.log(`   Mediciones: ${antesMediciones}`);

        // PASO 2: Eliminar duplicados de ACTIVIDADES
        console.log('\n🗑️  Eliminando duplicados de actividades...');
        const resultActividades = await prisma.$executeRaw`
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
        `;
        console.log(`   ✓ ${resultActividades} actividades duplicadas eliminadas`);

        // PASO 3: Eliminar duplicados de MEDICIONES
        console.log('\n🗑️  Eliminando duplicados de mediciones...');
        const resultMediciones = await prisma.$executeRaw`
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
        `;
        console.log(`   ✓ ${resultMediciones} mediciones duplicadas eliminadas`);

        // PASO 4: Ver estado DESPUÉS
        console.log('\n📊 ESTADO DESPUÉS:');
        const despuesActividades = await prisma.actividades_ejecutadas.count({
            where: { id_orden_servicio: 640 }
        });
        const despuesMediciones = await prisma.mediciones_servicio.count({
            where: { id_orden_servicio: 640 }
        });
        console.log(`   Actividades: ${despuesActividades} (esperado: 34)`);
        console.log(`   Mediciones: ${despuesMediciones} (esperado: 8)`);

        console.log('\n✅ FIX COMPLETADO');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

ejecutarFix().catch(console.error);
