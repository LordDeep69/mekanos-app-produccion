import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(50));
    console.log('ESTADOS EN LA BD:');
    console.log('='.repeat(50));

    const estados = await prisma.estados_orden.findMany({
        orderBy: { id_estado: 'asc' }
    });

    for (const e of estados) {
        console.log(`ID: ${e.id_estado} | ${e.codigo_estado.padEnd(15)} | es_estado_final: ${e.es_estado_final}`);
    }

    // Verificar cuáles DEBERÍAN ser finales
    console.log('\n' + '='.repeat(50));
    console.log('CORRECCIÓN NECESARIA:');
    console.log('='.repeat(50));

    const estadosFinales = ['COMPLETADA', 'CANCELADA', 'CERRADA'];

    for (const codigo of estadosFinales) {
        const estado = estados.find(e => e.codigo_estado === codigo);
        if (estado && !estado.es_estado_final) {
            console.log(`⚠️ ${codigo} tiene es_estado_final=false, DEBERÍA ser true`);

            // Corregir
            await prisma.estados_orden.update({
                where: { id_estado: estado.id_estado },
                data: { es_estado_final: true }
            });
            console.log(`✅ CORREGIDO: ${codigo} ahora tiene es_estado_final=true`);
        }
    }

    await prisma.$disconnect();
}

main().catch(console.error);
