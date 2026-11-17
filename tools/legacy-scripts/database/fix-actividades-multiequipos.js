/**
 * Script para asignar actividades correctas a órdenes multi-equipo
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Asignando actividades a órdenes multi-equipos...\n');

  try {
    // Usar tipo de servicio "Preventivo Tipo A - Generador" (ID 3, 42 actividades)
    const idTipoServicio = 3;
    
    // Obtener actividades del catálogo
    const actividadesCatalogo = await prisma.catalogo_actividades.findMany({
      where: {
        id_tipo_servicio: idTipoServicio,
        activo: true
      },
      orderBy: { orden_ejecucion: 'asc' }
    });
    
    console.log(`📋 Actividades en catálogo para tipo ${idTipoServicio}: ${actividadesCatalogo.length}\n`);

    // Obtener órdenes multi-equipo SIN actividades
    const ordenesMulti = await prisma.ordenes_servicio.findMany({
      where: {
        numero_orden: { startsWith: 'OS-ME-' }
      },
      include: {
        ordenes_actividades_plan: true
      }
    });

    console.log(`📋 Órdenes multi-equipo: ${ordenesMulti.length}`);
    
    let actualizadas = 0;
    for (const orden of ordenesMulti) {
      // Solo procesar órdenes sin actividades o con pocas
      if (orden.ordenes_actividades_plan.length < 10) {
        // Actualizar tipo de servicio
        await prisma.ordenes_servicio.update({
          where: { id_orden_servicio: orden.id_orden_servicio },
          data: { id_tipo_servicio: idTipoServicio }
        });

        // Borrar actividades actuales
        await prisma.ordenes_actividades_plan.deleteMany({
          where: { id_orden_servicio: orden.id_orden_servicio }
        });

        // Crear nuevas actividades
        await prisma.ordenes_actividades_plan.createMany({
          data: actividadesCatalogo.map((a, index) => ({
            id_orden_servicio: orden.id_orden_servicio,
            id_actividad_catalogo: a.id_actividad_catalogo,
            orden_secuencia: a.orden_ejecucion ?? index + 1,
            origen: 'ADMIN',
            es_obligatoria: a.es_obligatoria ?? true,
            creado_por: 1
          })),
          skipDuplicates: true
        });

        console.log(`  ✓ ${orden.numero_orden} (ID: ${orden.id_orden_servicio}): ${actividadesCatalogo.length} actividades asignadas`);
        actualizadas++;
      } else {
        console.log(`  - ${orden.numero_orden}: Ya tiene ${orden.ordenes_actividades_plan.length} actividades`);
      }
    }

    console.log(`\n🎉 ${actualizadas} órdenes actualizadas con ${actividadesCatalogo.length} actividades cada una.`);

  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
