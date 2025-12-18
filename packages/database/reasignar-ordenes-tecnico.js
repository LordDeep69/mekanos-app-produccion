/**
 * Script para reasignar TODAS las órdenes al técnico correcto (ID 6)
 * que corresponde al usuario admin@mekanos.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔧 REASIGNACIÓN DE ÓRDENES AL TÉCNICO CORRECTO\n');

    // 1. Verificar el empleado correcto para admin@mekanos.com
    const usuario = await prisma.usuarios.findFirst({
        where: { email: 'admin@mekanos.com' }
    });

    const empleado = await prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona }
    });

    console.log(`✅ Usuario: ${usuario.email} (ID ${usuario.id_usuario})`);
    console.log(`✅ Empleado correcto: ID ${empleado.id_empleado}`);

    // 2. Contar órdenes antes
    const antes = await prisma.ordenes_servicio.groupBy({
        by: ['id_tecnico_asignado'],
        _count: true
    });
    console.log('\n📊 ANTES de reasignar:');
    for (const t of antes) {
        console.log(`   Técnico ${t.id_tecnico_asignado}: ${t._count} órdenes`);
    }

    // 3. Reasignar TODAS las órdenes al técnico correcto (ID 6)
    const resultado = await prisma.ordenes_servicio.updateMany({
        where: {
            OR: [
                { id_tecnico_asignado: 1 },
                { id_tecnico_asignado: 2 },
                { id_tecnico_asignado: null }
            ]
        },
        data: {
            id_tecnico_asignado: empleado.id_empleado
        }
    });

    console.log(`\n✅ Órdenes reasignadas: ${resultado.count}`);

    // 4. Contar órdenes después
    const despues = await prisma.ordenes_servicio.groupBy({
        by: ['id_tecnico_asignado'],
        _count: true
    });
    console.log('\n📊 DESPUÉS de reasignar:');
    for (const t of despues) {
        console.log(`   Técnico ${t.id_tecnico_asignado}: ${t._count} órdenes`);
    }

    const total = await prisma.ordenes_servicio.count({
        where: { id_tecnico_asignado: empleado.id_empleado }
    });
    console.log(`\n🎉 Total órdenes para técnico ${empleado.id_empleado}: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
