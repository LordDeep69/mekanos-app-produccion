import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnóstico de orden OS-CORR-PLAN-679281\n');

  try {
    // 1. Verificar la orden existe
    const orden = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        os.id_orden_servicio,
        os.numero_orden,
        os.id_tecnico_asignado,
        os.id_cliente,
        os.id_equipo,
        os.id_tipo_servicio,
        ts.nombre_tipo as tipo_servicio,
        eo.nombre_estado as estado,
        eo.es_estado_final,
        emp.nombre_completo as nombre_tecnico,
        u.email as email_tecnico,
        u.id_usuario
      FROM ordenes_servicio os
      JOIN tipos_servicio ts ON ts.id_tipo_servicio = os.id_tipo_servicio
      JOIN estados_orden eo ON eo.id_estado = os.id_estado_actual
      LEFT JOIN empleados emp ON emp.id_empleado = os.id_tecnico_asignado
      LEFT JOIN usuarios u ON u.id_empleado = os.id_tecnico_asignado
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
    console.log(`   Estado: ${o.estado} (final: ${o.es_estado_final})`);
    console.log(`   Tipo servicio: ${o.tipo_servicio}`);
    console.log(`   ID Técnico asignado: ${o.id_tecnico_asignado}`);
    console.log(`   Nombre técnico: ${o.nombre_tecnico || 'NO ENCONTRADO'}`);
    console.log(`   Email técnico: ${o.email_tecnico || 'NO ENCONTRADO'}`);
    console.log(`   ID Usuario: ${o.id_usuario || 'NO ENCONTRADO'}`);

    // 2. Verificar plan de actividades
    const plan = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as total
      FROM ordenes_actividades_plan
      WHERE id_orden_servicio = ${o.id_orden_servicio}
    `);
    console.log(`\n🎯 Plan de actividades: ${plan[0]?.total || 0} actividades`);

    // 3. Verificar qué usuarios técnicos existen
    console.log('\n📋 Usuarios técnicos disponibles:');
    const tecnicos = await prisma.$queryRawUnsafe<any[]>(`
      SELECT u.id_usuario, u.email, u.id_empleado, emp.nombre_completo
      FROM usuarios u
      LEFT JOIN empleados emp ON emp.id_empleado = u.id_empleado
      WHERE u.id_rol = 2
      LIMIT 10
    `);
    
    for (const t of tecnicos) {
      console.log(`   - ID: ${t.id_usuario}, Email: ${t.email}, Empleado: ${t.id_empleado}, Nombre: ${t.nombre_completo}`);
    }

    // 4. Verificar estructura de estados
    console.log('\n📊 Estados de orden disponibles:');
    const estados = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id_estado, nombre_estado, es_estado_final
      FROM estados_orden
      ORDER BY id_estado
    `);
    
    for (const e of estados) {
      console.log(`   - ID: ${e.id_estado}, Nombre: ${e.nombre_estado}, Final: ${e.es_estado_final}`);
    }

    // 5. Verificar si hay más órdenes asignadas a ese técnico
    if (o.id_tecnico_asignado) {
      const otras = await prisma.$queryRawUnsafe<any[]>(`
        SELECT numero_orden, eo.nombre_estado
        FROM ordenes_servicio os
        JOIN estados_orden eo ON eo.id_estado = os.id_estado_actual
        WHERE os.id_tecnico_asignado = ${o.id_tecnico_asignado}
        AND eo.es_estado_final = false
        LIMIT 10
      `);
      
      console.log(`\n📋 Órdenes activas del técnico ${o.id_tecnico_asignado}:`);
      for (const ord of otras) {
        console.log(`   - ${ord.numero_orden} (${ord.nombre_estado})`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
