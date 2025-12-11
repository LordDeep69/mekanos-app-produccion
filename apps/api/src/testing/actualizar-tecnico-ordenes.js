/**
 * Actualiza el técnico de las órdenes recién creadas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n=== ACTUALIZANDO TÉCNICO EN ÓRDENES ===\n');

    // Actualizar las órdenes recién creadas (IDs 157, 158, 159)
    const result = await prisma.ordenes_servicio.updateMany({
        where: {
            numero_orden: { contains: 'OS-PRUEBA-1764886240305' }
        },
        data: {
            id_tecnico_asignado: 1
        }
    });

    console.log(`✅ ${result.count} órdenes actualizadas con técnico ID 1`);

    // Verificar
    const ordenes = await prisma.$queryRaw`
        SELECT numero_orden, id_tipo_servicio, id_tecnico_asignado, id_estado_actual
        FROM ordenes_servicio
        WHERE numero_orden LIKE 'OS-PRUEBA-1764886240305%'
    `;

    console.log('\n📋 Órdenes verificadas:');
    for (const o of ordenes) {
        console.log(`   ${o.numero_orden}`);
        console.log(`      Tipo: ${o.id_tipo_servicio}, Técnico: ${o.id_tecnico_asignado}, Estado: ${o.id_estado_actual}`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
