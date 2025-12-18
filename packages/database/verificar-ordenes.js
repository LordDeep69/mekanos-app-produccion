const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n📊 VERIFICACIÓN DE ÓRDENES EN BASE DE DATOS\n');

    const tipos = await p.tipos_servicio.findMany({
        where: { codigo_tipo: { in: ['GEN_PREV_A', 'GEN_PREV_B', 'BOM_PREV_A'] } }
    });

    for (const t of tipos) {
        const count = await p.ordenes_servicio.count({
            where: { id_tipo_servicio: t.id_tipo_servicio }
        });
        console.log(`  ${t.codigo_tipo}: ${count} órdenes`);
    }

    const total = await p.ordenes_servicio.count();
    console.log(`\n  TOTAL ÓRDENES EN BD: ${total}`);

    // Verificar asignación al técnico ID 1
    const ordenesDelTecnico = await p.ordenes_servicio.count({
        where: { id_tecnico_asignado: 1 }
    });
    console.log(`  Órdenes asignadas a Técnico ID 1: ${ordenesDelTecnico}`);
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
