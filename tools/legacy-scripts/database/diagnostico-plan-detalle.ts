import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnóstico detallado del plan de actividades\n');

  try {
    // 1. Orden y su tipo de servicio
    const orden = await prisma.$queryRawUnsafe<any[]>(`
      SELECT os.id_orden_servicio, os.numero_orden, os.id_tipo_servicio,
             ts.nombre_tipo, ts.codigo_tipo
      FROM ordenes_servicio os
      JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      WHERE os.numero_orden = 'OS-CORR-PLAN-679281'
    `);

    if (orden.length === 0) {
      console.log('❌ Orden no encontrada');
      return;
    }

    const o = orden[0];
    console.log('📋 ORDEN:');
    console.log(`   ID: ${o.id_orden_servicio}`);
    console.log(`   Tipo servicio ID: ${o.id_tipo_servicio}`);
    console.log(`   Tipo servicio: ${o.nombre_tipo} (${o.codigo_tipo})`);

    // 2. Plan de actividades con detalle
    console.log('\n🎯 PLAN DE ACTIVIDADES (detalle completo):');
    const plan = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        oap.id_orden_actividad_plan,
        oap.id_actividad_catalogo,
        oap.orden_secuencia,
        ca.codigo_actividad,
        ca.descripcion_actividad,
        ca.id_tipo_servicio as tipo_servicio_actividad,
        ts.nombre_tipo as nombre_tipo_actividad
      FROM ordenes_actividades_plan oap
      JOIN catalogo_actividades ca ON ca.id_actividad_catalogo = oap.id_actividad_catalogo
      JOIN tipos_servicio ts ON ts.id_tipo_servicio = ca.id_tipo_servicio
      WHERE oap.id_orden_servicio = ${o.id_orden_servicio}
      ORDER BY oap.orden_secuencia
    `);

    for (const act of plan) {
      const tipoMatch = act.tipo_servicio_actividad === o.id_tipo_servicio ? '✅' : '⚠️';
      console.log(`   ${act.orden_secuencia}. [${act.codigo_actividad}] ${act.descripcion_actividad}`);
      console.log(`      ID catálogo: ${act.id_actividad_catalogo}`);
      console.log(`      Tipo servicio: ${act.nombre_tipo_actividad} (ID: ${act.tipo_servicio_actividad}) ${tipoMatch}`);
    }

    // 3. Verificar qué envía el backend
    console.log('\n📤 LO QUE DEBERÍA ENVIAR EL BACKEND:');
    console.log('   El backend envía actividadesPlan con:');
    for (const act of plan) {
      console.log(`   { idActividadCatalogo: ${act.id_actividad_catalogo}, ordenSecuencia: ${act.orden_secuencia} }`);
    }

    // 4. Verificar el catálogo por tipo de servicio de la orden
    const catalogoPorTipo = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id_actividad_catalogo, codigo_actividad, descripcion_actividad
      FROM catalogo_actividades
      WHERE id_tipo_servicio = ${o.id_tipo_servicio}
      ORDER BY orden_ejecucion
    `);

    console.log(`\n📚 CATÁLOGO PARA TIPO ${o.nombre_tipo} (ID: ${o.id_tipo_servicio}):`);
    console.log(`   Total actividades: ${catalogoPorTipo.length}`);
    if (catalogoPorTipo.length <= 10) {
      for (const act of catalogoPorTipo) {
        console.log(`   - [${act.codigo_actividad}] ${act.descripcion_actividad}`);
      }
    } else {
      console.log('   (más de 10 actividades, mostrando primeras 5...)');
      for (const act of catalogoPorTipo.slice(0, 5)) {
        console.log(`   - [${act.codigo_actividad}] ${act.descripcion_actividad}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
