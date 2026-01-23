const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Ver todos los estados
    console.log('=== ESTADOS DE ORDEN ===');
    const estados = await prisma.estados_orden.findMany({ orderBy: { id_estado: 'asc' } });
    estados.forEach(e => {
        console.log(`${e.id_estado}: ${e.codigo_estado} | final=${e.es_estado_final}`);
    });

    // 2. Buscar Bruce Banner
    console.log('\n=== BRUCE BANNER ===');
    const bruce = await prisma.empleados.findFirst({
        where: { persona: { nombre_completo: { contains: 'Bruce' } } },
        include: { persona: true }
    });
    console.log('Empleado ID:', bruce?.id_empleado);
    console.log('Nombre:', bruce?.persona?.nombre_completo);

    // 3. Ver órdenes de Bruce
    if (bruce) {
        console.log('\n=== ORDENES DE BRUCE ===');
        const ordenes = await prisma.ordenes_servicio.findMany({
            where: { id_tecnico_asignado: bruce.id_empleado },
            include: { estados_orden: true },
            orderBy: { id_orden_servicio: 'asc' }
        });
        console.log('Total ordenes:', ordenes.length);
        ordenes.forEach(o => {
            console.log(`${o.numero_orden} | Estado ID: ${o.id_estado_actual} = ${o.estados_orden?.codigo_estado}`);
        });
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
