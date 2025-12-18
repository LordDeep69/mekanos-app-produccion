// Fix orden 160 - cambiar a estado EN_PROCESO
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== FIX ORDEN 160 ===\n');

    // 1. Ver estados disponibles
    console.log('1️⃣ ESTADOS DISPONIBLES:');
    const estados = await prisma.estados_orden.findMany({
        select: { id_estado: true, codigo_estado: true, nombre_estado: true, es_estado_final: true },
        orderBy: { id_estado: 'asc' }
    });
    estados.forEach(e => console.log(`  ${e.id_estado}: ${e.codigo_estado} (final: ${e.es_estado_final})`));

    // 2. Encontrar estado EN_PROCESO (no final)
    const estadoEnProceso = estados.find(e => e.codigo_estado === 'EN_PROCESO');
    console.log('\n2️⃣ ESTADO EN_PROCESO:', estadoEnProceso);

    // 3. Actualizar orden 160
    if (estadoEnProceso) {
        console.log('\n3️⃣ ACTUALIZANDO ORDEN 160...');
        await prisma.ordenes_servicio.update({
            where: { id_orden_servicio: 160 },
            data: { id_estado_actual: estadoEnProceso.id_estado }
        });
        console.log('✅ Orden 160 actualizada a EN_PROCESO');

        // 4. Verificar
        const orden = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: 160 },
            select: { id_orden_servicio: true, numero_orden: true, id_estado_actual: true }
        });
        console.log('\n4️⃣ VERIFICACIÓN:', orden);

        // 5. Verificar que ahora aparece en sync
        console.log('\n5️⃣ SIMULANDO SYNC:');
        const ordenes = await prisma.ordenes_servicio.findMany({
            where: {
                id_tecnico_asignado: 1,
                estado: { es_estado_final: false }
            },
            select: { id_orden_servicio: true, numero_orden: true },
            orderBy: { id_orden_servicio: 'desc' },
            take: 5
        });
        console.log('Últimas 5 órdenes:');
        ordenes.forEach(o => console.log(`  ${o.id_orden_servicio}: ${o.numero_orden}`));

        const incluida = ordenes.find(o => o.id_orden_servicio === 160);
        console.log('\n✅ ORDEN 160 INCLUIDA:', incluida ? 'SÍ' : 'NO');
    }
}

main()
    .catch(e => console.error('Error:', e.message))
    .finally(() => prisma.$disconnect());
