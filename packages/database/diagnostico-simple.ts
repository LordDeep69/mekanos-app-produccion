import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnóstico de orden OS-CORR-PLAN-679281\n');

  try {
    // 1. Verificar la orden existe (query simple)
    const orden = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        os.id_orden_servicio,
        os.numero_orden,
        os.id_tecnico_asignado,
        os.id_estado_actual,
        os.id_tipo_servicio,
        ts.nombre_tipo as tipo_servicio,
        eo.nombre_estado as estado,
        eo.es_estado_final
      FROM ordenes_servicio os
      JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      JOIN estados_orden eo ON eo.id_estado = os.id_estado_actual
      WHERE os.numero_orden = 'OS-CORR-PLAN-679281'
    `);

    if (orden.length === 0) {
      console.log('❌ Orden NO encontrada en la base de datos');
      return;
    }

    const o = orden[0];
    console.log('✅ Orden encontrada:');
    console.log(`   ID: ${o.id_orden_servicio}`);
    console.log(`   Número: ${o.numero_orden}`);
    console.log(`   Estado ID: ${o.id_estado_actual}`);
    console.log(`   Estado: ${o.estado} (final: ${o.es_estado_final})`);
    console.log(`   Tipo servicio: ${o.tipo_servicio}`);
    console.log(`   ID Técnico asignado: ${o.id_tecnico_asignado}`);

    // 2. Verificar plan de actividades
    const plan = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as total
      FROM ordenes_actividades_plan
      WHERE id_orden_servicio = ${o.id_orden_servicio}
    `);
    console.log(`\n🎯 Plan de actividades: ${plan[0]?.total || 0} actividades`);

    // 3. Verificar estados disponibles
    console.log('\n📊 Estados de orden disponibles:');
    const estados = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id_estado, codigo_estado, nombre_estado, es_estado_final
      FROM estados_orden
      ORDER BY id_estado
    `);
    
    for (const e of estados) {
      const marker = e.id_estado === o.id_estado_actual ? ' <<< ACTUAL' : '';
      console.log(`   - ID: ${e.id_estado}, ${e.codigo_estado}: ${e.nombre_estado} (final: ${e.es_estado_final})${marker}`);
    }

    // 4. Verificar órdenes del técnico
    if (o.id_tecnico_asignado) {
      const otras = await prisma.$queryRawUnsafe<any[]>(`
        SELECT os.numero_orden, eo.nombre_estado
        FROM ordenes_servicio os
        JOIN estados_orden eo ON eo.id_estado = os.id_estado_actual
        WHERE os.id_tecnico_asignado = ${o.id_tecnico_asignado}
        AND (eo.es_estado_final = false OR eo.es_estado_final IS NULL)
        LIMIT 10
      `);
      
      console.log(`\n📋 Órdenes activas del técnico ${o.id_tecnico_asignado}:`);
      if (otras.length === 0) {
        console.log('   (ninguna orden activa)');
      } else {
        for (const ord of otras) {
          console.log(`   - ${ord.numero_orden} (${ord.nombre_estado})`);
        }
      }
    }

    // 5. Verificar si el ID de estado 1 es ASIGNADA (que debería aparecer en la app)
    console.log('\n🔍 Verificando filtros del sync service:');
    console.log('   El sync del backend filtra órdenes por:');
    console.log('   - estado.es_estado_final = false (órdenes activas)');
    console.log('   - O completadas en últimos 30 días');
    console.log(`   - Estado actual de la orden: ${o.id_estado_actual} - ${o.estado}`);
    console.log(`   - es_estado_final = ${o.es_estado_final}`);

    if (o.es_estado_final === true) {
      console.log('\n⚠️ PROBLEMA: El estado es FINAL, la orden no aparecerá como activa');
    } else {
      console.log('\n✅ La orden DEBERÍA aparecer en el sync (estado no es final)');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
