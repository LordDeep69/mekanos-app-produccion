const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== LIMPIEZA HARD DELETE DE CATÁLOGOS ===\n');

    const serviciosCore = [3, 4, 5]; // GEN_PREV_A, GEN_PREV_B, BOM_PREV_A

    // 1. Estado actual
    console.log('=== ESTADO ANTES DE LIMPIEZA ===');
    const todosServicios = await prisma.tipos_servicio.findMany();
    const todasActividades = await prisma.catalogo_actividades.findMany({
        include: { _count: { select: { actividades_ejecutadas: true } } }
    });
    const todosSistemas = await prisma.catalogo_sistemas.findMany({
        include: { _count: { select: { catalogo_actividades: true } } }
    });

    console.log(`Tipos de servicio: ${todosServicios.length}`);
    console.log(`Actividades: ${todasActividades.length}`);
    console.log(`Sistemas: ${todosSistemas.length}`);

    // Servicios a eliminar
    const serviciosAEliminar = todosServicios.filter(s => !serviciosCore.includes(s.id_tipo_servicio));
    console.log(`\nServicios a ELIMINAR: ${serviciosAEliminar.length}`);
    serviciosAEliminar.forEach(s => console.log(`  - [${s.id_tipo_servicio}] ${s.codigo_tipo}`));

    const idsServiciosEliminar = serviciosAEliminar.map(s => s.id_tipo_servicio);

    // Actividades: separar las que están en uso vs las que se pueden eliminar
    const actividadesNoCore = todasActividades.filter(a =>
        a.id_tipo_servicio && idsServiciosEliminar.includes(a.id_tipo_servicio)
    );
    const actividadesAEliminar = actividadesNoCore.filter(a => a._count.actividades_ejecutadas === 0);
    const actividadesEnUso = actividadesNoCore.filter(a => a._count.actividades_ejecutadas > 0);

    console.log(`\nActividades a ELIMINAR: ${actividadesAEliminar.length}`);
    console.log(`Actividades EN USO (se desvinculan): ${actividadesEnUso.length}`);

    // Sistemas a eliminar (vacíos o de prueba)
    const sistemasAEliminar = todosSistemas.filter(s =>
        s.codigo_sistema.startsWith('SYS-') || s.codigo_sistema.startsWith('TEST_')
    );
    console.log(`\nSistemas a ELIMINAR: ${sistemasAEliminar.length}`);

    // 2. EJECUTAR
    console.log('\n=== EJECUTANDO HARD DELETE ===');

    // 2.1 Desvincular actividades en uso
    if (actividadesEnUso.length > 0) {
        const ids = actividadesEnUso.map(a => a.id_actividad_catalogo);
        const updated = await prisma.catalogo_actividades.updateMany({
            where: { id_actividad_catalogo: { in: ids } },
            data: { id_tipo_servicio: null }
        });
        console.log(`⚠️ Actividades desvinculadas: ${updated.count}`);
    }

    // 2.2 Eliminar actividades no usadas
    if (actividadesAEliminar.length > 0) {
        const ids = actividadesAEliminar.map(a => a.id_actividad_catalogo);
        const deleted = await prisma.catalogo_actividades.deleteMany({
            where: { id_actividad_catalogo: { in: ids } }
        });
        console.log(`✅ Actividades eliminadas: ${deleted.count}`);
    }

    // 2.3 Eliminar servicios no-core
    if (idsServiciosEliminar.length > 0) {
        const deleted = await prisma.tipos_servicio.deleteMany({
            where: { id_tipo_servicio: { in: idsServiciosEliminar } }
        });
        console.log(`✅ Tipos de servicio eliminados: ${deleted.count}`);
    }

    // 2.4 Eliminar sistemas vacíos
    for (const sistema of sistemasAEliminar) {
        const count = await prisma.catalogo_actividades.count({
            where: { id_sistema: sistema.id_sistema }
        });
        if (count === 0) {
            await prisma.catalogo_sistemas.delete({ where: { id_sistema: sistema.id_sistema } });
            console.log(`✅ Sistema eliminado: ${sistema.codigo_sistema}`);
        }
    }

    // 3. Estado final
    console.log('\n=== ESTADO FINAL ===');
    const serviciosFinales = await prisma.tipos_servicio.findMany({
        include: { _count: { select: { catalogo_actividades: true } } },
        orderBy: { id_tipo_servicio: 'asc' }
    });
    console.log(`\nTipos de servicio CORE (${serviciosFinales.length}):`);
    serviciosFinales.forEach(s => {
        console.log(`  ✅ [${s.id_tipo_servicio}] ${s.codigo_tipo}: ${s.nombre_tipo} (${s._count.catalogo_actividades} act)`);
    });

    const sistemasFinales = await prisma.catalogo_sistemas.findMany({
        include: { _count: { select: { catalogo_actividades: true } } },
        orderBy: { orden_visualizacion: 'asc' }
    });
    console.log(`\nSistemas (${sistemasFinales.length}):`);
    sistemasFinales.forEach(s => {
        console.log(`  ✅ [${s.id_sistema}] ${s.codigo_sistema} (${s._count.catalogo_actividades} act)`);
    });

    const actFinales = await prisma.catalogo_actividades.count();
    console.log(`\nTotal actividades: ${actFinales}`);
    console.log('\n✅ LIMPIEZA COMPLETADA');
}

main().catch(console.error).finally(() => prisma.$disconnect());
