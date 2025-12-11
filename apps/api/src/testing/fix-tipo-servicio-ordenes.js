const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
    // Actualizar órdenes 150 y 151 a id_tipo_servicio=3 (GEN_PREV_A con 42 actividades)
    const result = await p.ordenes_servicio.updateMany({
        where: { id_orden_servicio: { in: [150, 151] } },
        data: { id_tipo_servicio: 3 }
    });
    console.log(`✅ ${result.count} órdenes actualizadas a id_tipo_servicio=3 (GEN_PREV_A - 42 actividades)`);

    // Verificar
    const ordenes = await p.ordenes_servicio.findMany({
        where: { id_orden_servicio: { in: [150, 151] } },
        select: { numero_orden: true, id_tipo_servicio: true, tipo_servicio: { select: { nombre_tipo: true } } }
    });
    for (const o of ordenes) {
        console.log(`   ${o.numero_orden}: tipo_servicio=${o.id_tipo_servicio} (${o.tipo_servicio?.nombre_tipo})`);
    }

    await p.$disconnect();
}

fix().catch(console.error);
