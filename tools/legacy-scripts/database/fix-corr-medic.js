const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== FIX CORR_MEDIC ===\n');

    // Buscar la actividad por codigo
    const act = await p.catalogo_actividades.findFirst({
        where: { codigo_actividad: 'CORR_MEDIC' }
    });

    if (!act) {
        console.log('❌ No se encontró CORR_MEDIC');
        return;
    }

    console.log(`Encontrado: ID=${act.id_actividad_catalogo}, tipo=${act.tipo_actividad}`);

    // Actualizar a VERIFICACION
    await p.catalogo_actividades.update({
        where: { id_actividad_catalogo: act.id_actividad_catalogo },
        data: { tipo_actividad: 'VERIFICACION' }
    });

    console.log('✅ CORR_MEDIC actualizado a VERIFICACION');

    await p.$disconnect();
}

main();
