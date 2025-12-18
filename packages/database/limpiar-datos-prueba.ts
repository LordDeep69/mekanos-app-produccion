/**
 * LIMPIEZA DE DATOS DE PRUEBA
 * ============================
 * Elimina equipos TEST, órdenes TEST, y personas de prueba
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function limpiarDatosPrueba() {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║         LIMPIEZA DE DATOS DE PRUEBA - SUPABASE               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // 1. Eliminar orden de prueba OS-2025-001 y sus dependencias
    console.log('━━━ PASO 1: Eliminar orden OS-2025-001 ━━━');

    const ordenPrueba = await prisma.ordenes_servicio.findFirst({
        where: { numero_orden: 'OS-2025-001' }
    });

    if (ordenPrueba) {
        const idOrden = ordenPrueba.id_orden_servicio;

        // Eliminar dependencias en orden correcto
        console.log('  ℹ️ Procesando dependencias...');

        await prisma.evidencias_fotograficas.deleteMany({ where: { id_orden_servicio: idOrden } });
        console.log('  ✅ Evidencias eliminadas');

        await prisma.mediciones_servicio.deleteMany({ where: { id_orden_servicio: idOrden } });
        console.log('  ✅ Mediciones eliminadas');

        await prisma.actividades_ejecutadas.deleteMany({ where: { id_orden_servicio: idOrden } });
        console.log('  ✅ Actividades ejecutadas eliminadas');

        await prisma.gastos_orden.deleteMany({ where: { id_orden_servicio: idOrden } });
        console.log('  ✅ Gastos eliminados');

        // Eliminar historial usando SQL directo (evitar problemas de constraint)
        await prisma.$executeRaw`DELETE FROM historial_estados_orden WHERE id_orden_servicio = ${idOrden}`;
        console.log('  ✅ Historial estados eliminado');

        // Finalmente eliminar la orden usando SQL raw
        await prisma.$executeRaw`DELETE FROM ordenes_servicio WHERE id_orden_servicio = ${idOrden}`;
        console.log('  ✅ Orden OS-2025-001 eliminada');
    } else {
        console.log('  ℹ️ Orden OS-2025-001 no encontrada');
    }

    // 2. Eliminar equipos de prueba
    console.log('\n━━━ PASO 2: Eliminar equipos de prueba ━━━');

    const equiposPrueba = await prisma.equipos.findMany({
        where: {
            OR: [
                { codigo_equipo: { contains: 'TEST' } },
                { codigo_equipo: { startsWith: 'GEN-TEST' } },
                { codigo_equipo: { startsWith: 'BOMBA-TEST' } },
                { codigo_equipo: { startsWith: 'MOTOR-TEST' } },
            ]
        },
        select: { id_equipo: true, codigo_equipo: true }
    });

    if (equiposPrueba.length > 0) {
        console.log(`  Encontrados ${equiposPrueba.length} equipos de prueba`);

        for (const equipo of equiposPrueba) {
            try {
                // Eliminar dependencias del equipo
                await prisma.equipos_generador.deleteMany({ where: { id_equipo: equipo.id_equipo } });
                await prisma.equipos_motor.deleteMany({ where: { id_equipo: equipo.id_equipo } });
                await prisma.equipos_bomba.deleteMany({ where: { id_equipo: equipo.id_equipo } });
                await prisma.componentes_equipo.deleteMany({ where: { id_equipo: equipo.id_equipo } });

                // Eliminar órdenes asociadas si las hay
                const ordenesEquipo = await prisma.ordenes_servicio.findMany({
                    where: { id_equipo: equipo.id_equipo },
                    select: { id_orden_servicio: true }
                });

                for (const orden of ordenesEquipo) {
                    await prisma.$executeRaw`DELETE FROM historial_estados_orden WHERE id_orden_servicio = ${orden.id_orden_servicio}`;
                    await prisma.evidencias_fotograficas.deleteMany({ where: { id_orden_servicio: orden.id_orden_servicio } });
                    await prisma.mediciones_servicio.deleteMany({ where: { id_orden_servicio: orden.id_orden_servicio } });
                    await prisma.actividades_ejecutadas.deleteMany({ where: { id_orden_servicio: orden.id_orden_servicio } });
                    await prisma.gastos_orden.deleteMany({ where: { id_orden_servicio: orden.id_orden_servicio } });
                }
                await prisma.$executeRaw`DELETE FROM ordenes_servicio WHERE id_equipo = ${equipo.id_equipo}`;

                // Eliminar equipo usando SQL raw
                await prisma.$executeRaw`DELETE FROM equipos WHERE id_equipo = ${equipo.id_equipo}`;
            } catch (e) {
                console.log(`  ⚠️ No se pudo eliminar ${equipo.codigo_equipo}: ${e}`);
            }
        }
        console.log(`  ✅ ${equiposPrueba.length} equipos de prueba procesados`);
    } else {
        console.log('  ℹ️ No hay equipos de prueba');
    }

    // 3. Verificación final
    console.log('\n━━━ VERIFICACIÓN FINAL ━━━');

    const equiposRestantes = await prisma.equipos.count({
        where: { codigo_equipo: { contains: 'TEST' } }
    });

    const ordenesRestantes = await prisma.ordenes_servicio.count({
        where: { numero_orden: { startsWith: 'TEST' } }
    });

    const totalEquipos = await prisma.equipos.count({ where: { activo: true } });
    const totalOrdenes = await prisma.ordenes_servicio.count();
    const totalClientes = await prisma.clientes.count();

    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`║  RESULTADO DE LIMPIEZA                                       ║`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);
    console.log(`║  Equipos TEST restantes:  ${String(equiposRestantes).padStart(3)}                                ║`);
    console.log(`║  Órdenes TEST restantes:  ${String(ordenesRestantes).padStart(3)}                                ║`);
    console.log(`╠══════════════════════════════════════════════════════════════╣`);
    console.log(`║  Total equipos activos:   ${String(totalEquipos).padStart(3)}                                ║`);
    console.log(`║  Total órdenes:           ${String(totalOrdenes).padStart(3)}                                ║`);
    console.log(`║  Total clientes:          ${String(totalClientes).padStart(3)}                                ║`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);

    if (equiposRestantes === 0 && ordenesRestantes === 0) {
        console.log('\n✅ LIMPIEZA COMPLETADA - BD lista para producción\n');
    }

    await prisma.$disconnect();
}

limpiarDatosPrueba().catch(console.error);
