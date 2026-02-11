const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetear() {
    const NUMERO_ORDEN = 'OS-202602-0027';
    console.log(`\n🔄 Reseteando orden ${NUMERO_ORDEN} a EN_PROCESO...\n`);

    // 1. Buscar la orden por numero_orden
    const orden = await prisma.ordenes_servicio.findFirst({
        where: { numero_orden: NUMERO_ORDEN },
        include: {
            estados_orden: true,
            _count: {
                select: {
                    evidencias_fotograficas: true,
                    actividades_ejecutadas: true,
                    mediciones_servicio: true,
                }
            }
        }
    });

    if (!orden) {
        console.log(`❌ Orden ${NUMERO_ORDEN} NO encontrada en la base de datos.`);
        await prisma.$disconnect();
        return;
    }

    console.log(`📋 Orden encontrada:`);
    console.log(`   - ID: ${orden.id_orden_servicio}`);
    console.log(`   - Estado actual: ${orden.estados_orden?.codigo_estado} (id=${orden.id_estado_actual})`);
    console.log(`   - Fecha inicio real: ${orden.fecha_inicio_real}`);
    console.log(`   - Fecha fin real: ${orden.fecha_fin_real}`);
    console.log(`   - Evidencias: ${orden._count.evidencias_fotograficas}`);
    console.log(`   - Actividades ejecutadas: ${orden._count.actividades_ejecutadas}`);
    console.log(`   - Mediciones: ${orden._count.mediciones_servicio}`);

    // 2. Obtener ID del estado EN_PROCESO
    const estadoEnProceso = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'EN_PROCESO' }
    });

    if (!estadoEnProceso) {
        console.log('❌ Estado EN_PROCESO no encontrado en catálogo.');
        await prisma.$disconnect();
        return;
    }

    console.log(`\n🎯 Estado destino: EN_PROCESO (id=${estadoEnProceso.id_estado})`);

    // 3. Resetear la orden: cambiar estado y limpiar campos de finalización
    //    ⚠️ NO se borran: evidencias, firmas, actividades, mediciones
    //    Solo se limpia: fecha_fin_real, estado, observaciones_cierre
    await prisma.ordenes_servicio.update({
        where: { id_orden_servicio: orden.id_orden_servicio },
        data: {
            id_estado_actual: estadoEnProceso.id_estado,
            fecha_fin_real: null,
            fecha_cambio_estado: new Date(),
            observaciones_cierre: null,
        }
    });

    // 4. Registrar en historial el cambio de estado (trazabilidad)
    await prisma.historial_estados_orden.create({
        data: {
            id_orden_servicio: orden.id_orden_servicio,
            id_estado_anterior: orden.id_estado_actual,
            id_estado_nuevo: estadoEnProceso.id_estado,
            fecha_cambio: new Date(),
            observaciones: 'Reversión manual: orden marcada como completada en móvil pero no sincronizó correctamente al portal. Se revierte a EN_PROCESO para permitir re-sincronización.',
            realizado_por: 1, // Admin
        }
    });

    console.log(`\n✅ Orden ${NUMERO_ORDEN} reseteada exitosamente:`);
    console.log(`   - Estado: EN_PROCESO (id=${estadoEnProceso.id_estado})`);
    console.log(`   - fecha_fin_real: null`);
    console.log(`   - observaciones_cierre: null`);
    console.log(`   - 📸 Evidencias PRESERVADAS: ${orden._count.evidencias_fotograficas}`);
    console.log(`   - ✅ Actividades PRESERVADAS: ${orden._count.actividades_ejecutadas}`);
    console.log(`   - 📏 Mediciones PRESERVADAS: ${orden._count.mediciones_servicio}`);
    console.log(`\n💡 El técnico puede ahora re-sincronizar desde la app móvil.`);

    await prisma.$disconnect();
}

resetear().catch(err => {
    console.error('❌ Error:', err);
    prisma.$disconnect();
});
