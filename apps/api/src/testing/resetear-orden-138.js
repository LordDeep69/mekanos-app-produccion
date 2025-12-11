const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetear() {
    console.log('Reseteando orden 138...');

    // 1. Obtener ID del estado EN_PROCESO
    const estado = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'EN_PROCESO' }
    });

    // 2. Resetear orden: quitar fecha_fin y cambiar estado
    await prisma.ordenes_servicio.update({
        where: { id_orden_servicio: 138 },
        data: {
            fecha_fin_real: null,  // Limpiar fecha fin
            estado: { connect: { id_estado: estado.id_estado } }
        }
    });

    console.log('✅ Orden 138 reseteada a EN_PROCESO');
    console.log('   - fecha_fin_real: null');
    console.log('   - estado: EN_PROCESO');

    await prisma.$disconnect();
}

resetear().catch(console.error);
