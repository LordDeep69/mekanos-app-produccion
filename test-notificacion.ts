/**
 * Script de prueba para crear notificación
 * Ejecutar con: npx ts-node test-notificacion.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function crearNotificacionPrueba() {
    console.log('🔔 Creando notificación de prueba para usuario 1...');

    const notificacion = await prisma.notificaciones.create({
        data: {
            id_usuario: 1,
            tipo_notificacion: 'ORDEN_ASIGNADA',
            titulo: '📋 Nueva Orden Asignada - PRUEBA',
            mensaje: 'Se te ha asignado una nueva orden de servicio: Mantenimiento Preventivo Tipo B para equipo GEN-001. ¡Esta es una notificación de prueba!',
            prioridad: 'ALTA',
            leida: false,
            fecha_creacion: new Date(),
            id_entidad_relacionada: 1,
            tipo_entidad_relacionada: 'ORDEN_SERVICIO',
            url_accion: '/ordenes/1',
        },
    });

    console.log('✅ Notificación creada:', notificacion);
    console.log('\n📱 Revisa la app móvil - debería aparecer la notificación');
}

crearNotificacionPrueba()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
