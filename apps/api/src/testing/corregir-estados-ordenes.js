/**
 * Corregir el estado de las órdenes nuevas a EN_PROCESO
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corregir() {
    console.log('\n=== CORRIGIENDO ESTADOS DE ÓRDENES ===\n');

    // Buscar estado EN_PROCESO
    const estadoEnProceso = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'EN_PROCESO' }
    });

    if (!estadoEnProceso) {
        console.log('❌ Estado EN_PROCESO no encontrado');
        return;
    }

    console.log(`✅ Estado EN_PROCESO encontrado: ID ${estadoEnProceso.id_estado}`);

    // Actualizar órdenes 157, 158, 159
    const result = await prisma.ordenes_servicio.updateMany({
        where: {
            id_orden_servicio: { in: [157, 158, 159] }
        },
        data: {
            id_estado_actual: estadoEnProceso.id_estado
        }
    });

    console.log(`✅ ${result.count} órdenes actualizadas a EN_PROCESO`);

    // Verificar
    const ordenes = await prisma.ordenes_servicio.findMany({
        where: { id_orden_servicio: { in: [157, 158, 159] } },
        include: { estado: true }
    });

    console.log('\n📋 ESTADO ACTUAL:');
    for (const o of ordenes) {
        console.log(`   ${o.id_orden_servicio}: ${o.numero_orden} → ${o.estado?.codigo_estado}`);
    }

    await prisma.$disconnect();
}

corregir().catch(console.error);
