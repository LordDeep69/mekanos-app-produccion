/**
 * Verificar notificaciones creadas
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICACIÓN DE NOTIFICACIONES ===\n');

    // Conteo no leídas
    const countNoLeidas = await p.notificaciones.count({
        where: { id_usuario: 1, leida: false }
    });
    console.log(`📬 Notificaciones NO leídas para admin (id=1): ${countNoLeidas}`);

    // Total
    const countTotal = await p.notificaciones.count({
        where: { id_usuario: 1 }
    });
    console.log(`📊 Total notificaciones: ${countTotal}`);

    // Últimas 15
    const lista = await p.notificaciones.findMany({
        where: { id_usuario: 1 },
        take: 15,
        orderBy: { fecha_creacion: 'desc' },
        select: {
            id_notificacion: true,
            titulo: true,
            tipo_notificacion: true,
            prioridad: true,
            leida: true,
            id_entidad_relacionada: true
        }
    });

    console.log('\n📋 Últimas 15 notificaciones:');
    lista.forEach((n, i) => {
        const estado = n.leida ? '✓' : '●';
        console.log(`  ${i + 1}. [${estado}] ${n.titulo}`);
        console.log(`     Tipo: ${n.tipo_notificacion} | Prioridad: ${n.prioridad} | Orden: ${n.id_entidad_relacionada}`);
    });

    await p.$disconnect();
}

main().catch(console.error);
