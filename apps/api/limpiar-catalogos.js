const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== LIMPIEZA HARD DELETE DE CATÁLOGOS ===\n');

    // IDs de servicios CORE a mantener
    const serviciosCore = [3, 4, 5]; // GEN_PREV_A, GEN_PREV_B, BOM_PREV_A

    // 1. Ver estado actual
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

    // Identificar servicios a eliminar
    const serviciosAEliminar = todosServicios.filter(s => !serviciosCore.includes(s.id_tipo_servicio));
    console.log(`\nServicios a ELIMINAR: ${serviciosAEliminar.length}`);
    serviciosAEliminar.forEach(s => console.log(`  - [${s.id_tipo_servicio}] ${s.codigo_tipo}: ${s.nombre_tipo}`));

    // Identificar actividades a eliminar (que pertenecen a servicios no-core Y no están usadas en órdenes)
    const idsServiciosEliminar = serviciosAEliminar.map(s => s.id_tipo_servicio);
    const actividadesAEliminar = todasActividades.filter(a =>
        a.id_tipo_servicio &&
        !serviciosCore.includes(a.id_tipo_servicio) &&
        a._count.actividades_ejecutadas === 0 // Solo las que NO están usadas
    );
    const actividadesEnUso = todasActividades.filter(a =>
        a.id_tipo_servicio &&
        !serviciosCore.includes(a.id_tipo_servicio) &&
        a._count.actividades_ejecutadas > 0
    );

    console.log(`\nActividades a ELIMINAR: ${actividadesAEliminar.length}`);
    console.log(`Actividades EN USO (se desvinculan): ${actividadesEnUso.length}`);

    // Identificar sistemas duplicados/vacíos
    const sistemasAEliminar = todosSistemas.filter(s =>
        s._count.catalogo_actividades === 0 || s.codigo_sistema.startsWith('SYS-') || s.codigo_sistema.startsWith('TEST_')
    );
    console.log(`\nSistemas a ELIMINAR: ${sistemasAEliminar.length}`);
    sistemasAEliminar.forEach(s => console.log(`  - [${s.id_sistema}] ${s.codigo_sistema}: ${s.nombre_sistema}`));

    // 2. EJECUTAR ELIMINACIONES
    console.log('\n=== EJECUTANDO HARD DELETE ===');

    // 2.1 Desvincular actividades en uso de servicios no-core (poner id_tipo_servicio = null)
    if (actividadesEnUso.length > 0) {
        const idsActividadesEnUso = actividadesEnUso.map(a => a.id_actividad_catalogo);
        const updated = await prisma.catalogo_actividades.updateMany({
            where: { id_actividad_catalogo: { in: idsActividadesEnUso } },
            data: { id_tipo_servicio: null }
        orderBy: { id_tipo_servicio: 'asc' }
        });
        console.log(`\nTipos de servicio CORE (${serviciosFinales.length}):`);
        serviciosFinales.forEach(s => {
            console.log(`  ✅ [${s.id_tipo_servicio}] ${s.codigo_tipo}: ${s.nombre_tipo} (${s._count.catalogo_actividades} actividades)`);
        });

        const sistemasFinales = await prisma.catalogo_sistemas.findMany({
            include: { _count: { select: { catalogo_actividades: true } } },
            orderBy: { orden_visualizacion: 'asc' }
        });
        console.log(`\nSistemas (${sistemasFinales.length}):`);
        sistemasFinales.forEach(s => {
            console.log(`  ✅ [${s.id_sistema}] ${s.codigo_sistema}: ${s.nombre_sistema} (${s._count.catalogo_actividades} actividades)`);
        });

        const actividadesFinales = await prisma.catalogo_actividades.count();
        console.log(`\nTotal actividades: ${actividadesFinales}`);

        const parametrosFinales = await prisma.parametros_medicion.count({ where: { activo: true } });
        console.log(`Total parámetros activos: ${parametrosFinales}`);

        console.log('\n✅ LIMPIEZA COMPLETADA');
    }

    main().catch(console.error).finally(() => prisma.$disconnect());
