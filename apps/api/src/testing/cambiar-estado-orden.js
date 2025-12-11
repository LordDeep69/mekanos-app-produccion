/**
 * Cambia el estado de una orden a EN_PROCESO para permitir finalización
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cambiarEstadoOrden(ordenId) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🔧 CAMBIANDO ESTADO DE ORDEN ${ordenId} A EN_PROCESO`);
    console.log('═══════════════════════════════════════════════════════════════');

    try {
        // 1. Buscar el ID del estado EN_PROCESO
        const estadoEnProceso = await prisma.estados_orden.findFirst({
            where: { codigo_estado: 'EN_PROCESO' }
        });

        if (!estadoEnProceso) {
            console.log('❌ No se encontró el estado EN_PROCESO');
            return;
        }

        console.log(`📌 Estado EN_PROCESO ID: ${estadoEnProceso.id_estado}`);

        // 2. Obtener orden actual
        const ordenActual = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: ordenId },
            include: { estado: true }
        });

        if (!ordenActual) {
            console.log(`❌ Orden ${ordenId} no encontrada`);
            return;
        }

        console.log(`📋 Orden: ${ordenActual.numero_orden}`);
        console.log(`📌 Estado actual: ${ordenActual.estado?.nombre || ordenActual.id_estado}`);

        // 3. Actualizar estado
        await prisma.ordenes_servicio.update({
            where: { id_orden_servicio: ordenId },
            data: {
                estado: { connect: { id_estado: estadoEnProceso.id_estado } },
                fecha_inicio_real: new Date() // Marcar que se inició
            }
        });

        console.log(`✅ Estado cambiado a EN_PROCESO`);

        // 4. Verificar
        const ordenActualizada = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: ordenId },
            include: { estado: true }
        });

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ VERIFICACIÓN:');
        console.log(`   Orden: ${ordenActualizada.numero_orden}`);
        console.log(`   Estado: ${ordenActualizada.estado?.nombre}`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Cambiar estado de orden 138
cambiarEstadoOrden(138);
