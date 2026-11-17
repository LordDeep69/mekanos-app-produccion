const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== CORRECTIVO - ACTIVIDADES ===\n');

    const acts = await p.catalogo_actividades.findMany({
        where: { id_tipo_servicio: 6 },
        orderBy: { orden_ejecucion: 'asc' }
    });

    console.log(`Total: ${acts.length} actividades\n`);

    acts.forEach((a, i) => {
        const param = a.id_parametro_medicion || 'NULL';
        console.log(`${i + 1}. [${a.tipo_actividad}] ${a.codigo_actividad} - idParam: ${param}`);
    });

    await p.$disconnect();
}

main();
