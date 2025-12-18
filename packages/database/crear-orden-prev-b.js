// Crear orden de Mantenimiento Preventivo Tipo B + Notificación
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Creando orden de Mantenimiento Preventivo Tipo B...');

    // Generar número único
    const numOrden = `PREVB-${Date.now().toString().slice(-6)}`;

    // Crear la orden usando SQL raw
    await prisma.$executeRaw`
        INSERT INTO ordenes_servicio (
            numero_orden, id_tipo_servicio, id_equipo, id_cliente,
            id_tecnico_asignado, id_estado_actual, prioridad, descripcion_inicial,
            fecha_creacion, creado_por
        ) VALUES (
            ${numOrden}, 4, 36, 1,
            1, 5, 'ALTA', 'Mantenimiento Preventivo Tipo B programado para generador Caterpillar 3516B. Incluye revisión completa, cambio de filtros, y mediciones.',
            NOW(), 1
        )
    `;

    // Obtener la orden recién creada
    const orden = await prisma.ordenes_servicio.findFirst({
        where: { numero_orden: numOrden },
        select: { id_orden_servicio: true, numero_orden: true }
    });

    console.log('✅ Orden creada:', orden.id_orden_servicio, orden.numero_orden);

    // Crear notificación de asignación
    const notif = await prisma.notificaciones.create({
        data: {
            id_usuario: 1,
            tipo_notificacion: 'ORDEN_ASIGNADA',
            titulo: `🔧 Nueva Orden: ${numOrden}`,
            mensaje: `Se te ha asignado Mantenimiento Preventivo Tipo B para equipo EQ-MOTOR-72167 (Caterpillar 3516B). Prioridad ALTA.`,
            prioridad: 'ALTA',
            leida: false,
            id_entidad_relacionada: orden.id_orden_servicio,
            tipo_entidad_relacionada: 'ORDEN_SERVICIO',
            url_accion: `/ordenes/${orden.id_orden_servicio}`,
        }
    });

    console.log('🔔 Notificación creada:', notif.id_notificacion);
    console.log('\n📱 HAZ HOT RESTART EN LA APP Y VERIFICA:');
    console.log('   1. Nueva orden en la lista');
    console.log('   2. Notificación en la campana');
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect());
