// Script simple para crear notificación de prueba
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔔 Creando notificación de prueba...');

    const notif = await prisma.notificaciones.create({
        data: {
            id_usuario: 1,
            tipo_notificacion: 'ORDEN_ASIGNADA',
            titulo: '📋 Nueva Orden Asignada - PRUEBA',
            mensaje: 'Se te ha asignado Mantenimiento Preventivo Tipo B para equipo GEN-001. Esta es una prueba de notificación en tiempo real.',
            prioridad: 'ALTA',
            leida: false,
            id_entidad_relacionada: 1,
            tipo_entidad_relacionada: 'ORDEN_SERVICIO',
        }
    });

    console.log('✅ Notificación creada con ID:', notif.id_notificacion);
    console.log('📱 Revisa la app móvil AHORA');
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect());
