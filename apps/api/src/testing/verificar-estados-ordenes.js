/**
 * Verificar estados de órdenes nuevas vs antiguas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificar() {
    console.log('\n=== ESTADOS DE ÓRDENES ===\n');

    // Órdenes nuevas (157, 158, 159)
    console.log('📋 ÓRDENES NUEVAS:');
    const nuevas = await prisma.ordenes_servicio.findMany({
        where: { id_orden_servicio: { in: [157, 158, 159] } },
        include: { estado: true }
    });
    for (const o of nuevas) {
        console.log(`   ${o.id_orden_servicio}: ${o.numero_orden} → Estado: ${o.estado?.codigo_estado}`);
    }

    // Buscar órdenes antiguas en EN_PROCESO o COMPLETADA
    console.log('\n📋 ÓRDENES ANTIGUAS QUE FUNCIONAN:');
    const antiguas = await prisma.ordenes_servicio.findMany({
        where: {
            id_orden_servicio: { lt: 150 },
            estado: { codigo_estado: { in: ['EN_PROCESO', 'COMPLETADA', 'APROBADA'] } }
        },
        take: 5,
        include: { estado: true }
    });
    for (const o of antiguas) {
        console.log(`   ${o.id_orden_servicio}: ${o.numero_orden} → Estado: ${o.estado?.codigo_estado}`);
    }

    // Estados permitidos según el backend
    console.log('\n⚠️ EL BACKEND SOLO PERMITE FINALIZAR ÓRDENES EN:');
    console.log('   - EN_PROCESO');
    console.log('   - EN_EJECUCION');
    console.log('   - PENDIENTE');
    console.log('');
    console.log('❌ LAS ÓRDENES NUEVAS ESTÁN EN PROGRAMADA → NO SE PUEDEN FINALIZAR');
    console.log('');
    console.log('🔧 SOLUCIÓN: Cambiar el estado de las órdenes a EN_PROCESO antes de finalizar');

    await prisma.$disconnect();
}

verificar().catch(console.error);
