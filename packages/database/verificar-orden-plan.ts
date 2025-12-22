import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Buscando órdenes con plan de actividades...\n');

    // Buscar órdenes con plan
    const ordenes = await prisma.$queryRawUnsafe<any[]>(`
      SELECT os.id_orden_servicio, os.numero_orden, 
             ts.nombre_tipo as tipo_servicio,
             e.nombre_equipo, e.codigo_equipo
      FROM ordenes_servicio os
      JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      JOIN equipos e ON e.id_equipo = os.id_equipo
      WHERE os.numero_orden LIKE 'OS-CORR-PLAN-%'
      ORDER BY os.fecha_creacion DESC
      LIMIT 5
    `);

    if (ordenes.length === 0) {
      console.log('❌ No se encontraron órdenes con plan');
      
      // Verificar si hay alguna orden correctiva reciente
      const recientes = await prisma.$queryRawUnsafe<any[]>(`
        SELECT os.id_orden_servicio, os.numero_orden, os.estado_actual
        FROM ordenes_servicio os
        JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
        WHERE ts.nombre_tipo ILIKE '%correctivo%'
        ORDER BY os.fecha_creacion DESC
        LIMIT 5
      `);
      console.log('\nÚltimas órdenes correctivas:', recientes);
      return;
    }

    console.log('✅ Órdenes encontradas:');
    for (const orden of ordenes) {
      console.log(`\n📋 Orden: ${orden.numero_orden}`);
      console.log(`   ID: ${orden.id_orden_servicio}`);
      console.log(`   Tipo: ${orden.tipo_servicio}`);
      console.log(`   Equipo: ${orden.codigo_equipo} - ${orden.nombre_equipo}`);

      // Buscar plan de actividades
      const plan = await prisma.$queryRawUnsafe<any[]>(`
        SELECT oap.orden_secuencia, ca.codigo_actividad, ca.descripcion_actividad
        FROM ordenes_actividades_plan oap
        JOIN catalogo_actividades ca ON ca.id_actividad_catalogo = oap.id_actividad_catalogo
        WHERE oap.id_orden_servicio = ${orden.id_orden_servicio}
        ORDER BY oap.orden_secuencia
      `);

      if (plan.length > 0) {
        console.log(`\n   🎯 Plan de actividades (${plan.length}):`);
        for (const act of plan) {
          console.log(`      ${act.orden_secuencia}. [${act.codigo_actividad}] ${act.descripcion_actividad}`);
        }
      } else {
        console.log('   ⚠️ Sin plan de actividades asociado');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
