/**
 * Verificar actividades por tipo de servicio
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICACIÓN DE ACTIVIDADES EN CATÁLOGO ===\n');

    const tipos = [
        { id: 4, nombre: 'GEN_PREV_B (Tipo B)' },
        { id: 5, nombre: 'BOM_PREV_A (Tipo A Bomba)' },
        { id: 6, nombre: 'CORRECTIVO' }
    ];

    for (const tipo of tipos) {
        const acts = await p.catalogo_actividades.findMany({
            where: { id_tipo_servicio: tipo.id },
            orderBy: { orden_ejecucion: 'asc' }
        });

        console.log(`📋 ${tipo.nombre}:`);
        console.log(`   Total actividades: ${acts.length}`);

        if (acts.length > 0) {
            acts.slice(0, 5).forEach(a => {
                console.log(`   - [${a.id_actividad_catalogo}] ${a.codigo_actividad} (${a.tipo_actividad})`);
            });
            if (acts.length > 5) console.log(`   ... y ${acts.length - 5} más`);
        } else {
            console.log('   ⚠️  SIN ACTIVIDADES EN CATÁLOGO');
        }
        console.log('');
    }

    await p.$disconnect();
}

main().catch(console.error);
