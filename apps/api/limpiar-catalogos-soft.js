const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== LIMPIEZA DE CATÁLOGOS (SOFT DELETE) ===\n');

    const serviciosCore = [3, 4, 5]; // GEN_PREV_A, GEN_PREV_B, BOM_PREV_A

    // Servicios a desactivar
    const serviciosNoCore = await prisma.tipos_servicio.findMany({
        where: { id_tipo_servicio: { notIn: serviciosCore } }
    });
    console.log(`Servicios a DESACTIVAR: ${serviciosNoCore.length}`);
    serviciosNoCore.forEach(s => console.log(`  - ${s.codigo_tipo}`));

    // 1. Desactivar servicios no-core
    const updatedServicios = await prisma.tipos_servicio.updateMany({
        where: { id_tipo_servicio: { notIn: serviciosCore } },
        data: { activo: false }
    });
    console.log(`\n✅ Servicios desactivados: ${updatedServicios.count}`);

    // 2. Desactivar actividades de servicios no-core
    const idsNoCore = serviciosNoCore.map(s => s.id_tipo_servicio);
    const updatedAct = await prisma.catalogo_actividades.updateMany({
        where: { id_tipo_servicio: { in: idsNoCore } },
        data: { activo: false }
    });
    console.log(`✅ Actividades desactivadas: ${updatedAct.count}`);

    // 3. Eliminar sistemas de prueba vacíos
    const sistemasPrueba = await prisma.catalogo_sistemas.findMany({
        where: {
            OR: [
                { codigo_sistema: { startsWith: 'SYS-' } },
                { codigo_sistema: { startsWith: 'TEST_' } }
            ]
        },
        include: { _count: { select: { catalogo_actividades: true } } }
    });

    for (const s of sistemasPrueba) {
        if (s._count.catalogo_actividades === 0) {
            await prisma.catalogo_sistemas.delete({ where: { id_sistema: s.id_sistema } });
            console.log(`✅ Sistema eliminado: ${s.codigo_sistema}`);
        } else {
            await prisma.catalogo_sistemas.update({
                where: { id_sistema: s.id_sistema },
                data: { activo: false }
            });
            console.log(`⚠️ Sistema desactivado: ${s.codigo_sistema}`);
        }
    }

    // ESTADO FINAL
    console.log('\n=== ESTADO FINAL (SOLO ACTIVOS) ===');

    const serviciosActivos = await prisma.tipos_servicio.findMany({
        where: { activo: true },
        include: { _count: { select: { catalogo_actividades: { where: { activo: true } } } } },
        orderBy: { id_tipo_servicio: 'asc' }
    });
    console.log(`\n🎯 TIPOS DE SERVICIO CORE (${serviciosActivos.length}):`);
    serviciosActivos.forEach(s => {
        console.log(`  ✅ ${s.codigo_tipo}: ${s.nombre_tipo} (${s._count.catalogo_actividades} actividades)`);
    });

    const sistemasActivos = await prisma.catalogo_sistemas.findMany({
        where: { activo: true },
        include: { _count: { select: { catalogo_actividades: { where: { activo: true } } } } },
        orderBy: { orden_visualizacion: 'asc' }
    });
    console.log(`\n⚙️ SISTEMAS ACTIVOS (${sistemasActivos.length}):`);
    sistemasActivos.forEach(s => {
        console.log(`  ✅ ${s.codigo_sistema}: ${s.nombre_sistema} (${s._count.catalogo_actividades} act)`);
    });

    const actTotal = await prisma.catalogo_actividades.count({ where: { activo: true } });
    console.log(`\n📋 Total actividades activas: ${actTotal}`);

    console.log('\n✅ LIMPIEZA COMPLETADA - Sistema limpio con solo servicios CORE');
}

main().catch(console.error).finally(() => prisma.$disconnect());
