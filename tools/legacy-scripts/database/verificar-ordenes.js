const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n📊 VERIFICACIÓN DE ÓRDENES MULTI-EQUIPO CREADAS\n');

    // Buscar las órdenes OS-ME-BOM2-*
    const ordenes = await p.ordenes_servicio.findMany({
        where: { numero_orden: { startsWith: 'OS-ME-BOM2' } },
        select: { id_orden_servicio: true, numero_orden: true },
        orderBy: { id_orden_servicio: 'asc' }
    });

    console.log(`  ✅ ÓRDENES OS-ME-BOM2-*: ${ordenes.length}`);
    
    for (const o of ordenes) {
        const equipos = await p.ordenes_equipos.count({
            where: { id_orden_servicio: o.id_orden_servicio }
        });
        console.log(`     ${o.numero_orden} (ID: ${o.id_orden_servicio}) -> ${equipos} equipos`);
    }
    
    // Verificar asignación al técnico ID 6
    const ordenesDelTecnico = await p.ordenes_servicio.count({
        where: { id_tecnico_asignado: 6, numero_orden: { startsWith: 'OS-ME-BOM2' } }
    });
    console.log(`\n  Órdenes asignadas a Técnico ID 6: ${ordenesDelTecnico}`);
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
