/**
 * CREAR ORDEN CORRECTIVA CON PLAN DE ACTIVIDADES PERSONALIZADO
 * Para validación de la funcionalidad plan-first en correctivos
 * 
 * Ejecutar: npx ts-node crear-orden-correctiva-con-plan.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔧 CREANDO ORDEN CORRECTIVA CON PLAN DE ACTIVIDADES');
  console.log('='.repeat(70));

  // 1. Buscar tipo de servicio CORRECTIVO
  const tiposServicio = await prisma.$queryRaw<any[]>`
    SELECT id_tipo_servicio, codigo_tipo, nombre_tipo 
    FROM tipos_servicio 
    WHERE codigo_tipo ILIKE '%CORR%' 
    LIMIT 1
  `;

  if (tiposServicio.length === 0) {
    console.log('❌ No se encontró tipo de servicio correctivo');
    const todos = await prisma.$queryRaw<any[]>`SELECT id_tipo_servicio, codigo_tipo FROM tipos_servicio LIMIT 10`;
    console.log('Tipos disponibles:', todos);
    return;
  }
  const tipoServicio = tiposServicio[0];
  console.log(`✅ Tipo servicio: ${tipoServicio.codigo_tipo} (ID: ${tipoServicio.id_tipo_servicio})`);

  // 2. Buscar equipo
  const equipos = await prisma.$queryRaw<any[]>`SELECT id_equipo, codigo_equipo FROM equipos WHERE activo = true LIMIT 1`;
  if (equipos.length === 0) { console.log('❌ No hay equipos'); return; }
  const equipo = equipos[0];
  console.log(`✅ Equipo: ${equipo.codigo_equipo} (ID: ${equipo.id_equipo})`);

  // 3. Buscar cliente
  const clientes = await prisma.$queryRaw<any[]>`SELECT id_cliente FROM clientes LIMIT 1`;
  if (clientes.length === 0) { console.log('❌ No hay clientes'); return; }
  const cliente = clientes[0];
  console.log(`✅ Cliente ID: ${cliente.id_cliente}`);

  // 4. Buscar empleado
  const empleados = await prisma.$queryRaw<any[]>`SELECT id_empleado FROM empleados LIMIT 1`;
  if (empleados.length === 0) { console.log('❌ No hay empleados'); return; }
  const empleado = empleados[0];
  console.log(`✅ Empleado ID: ${empleado.id_empleado}`);

  // 5. Buscar estado ASIGNADA
  const estados = await prisma.$queryRaw<any[]>`SELECT id_estado FROM estados_orden WHERE codigo_estado = 'ASIGNADA' LIMIT 1`;
  if (estados.length === 0) { console.log('❌ No hay estado ASIGNADA'); return; }
  const estadoAsignada = estados[0];
  console.log(`✅ Estado ASIGNADA ID: ${estadoAsignada.id_estado}`);

  // 6. Buscar 5 actividades del catálogo
  const actividades = await prisma.$queryRaw<any[]>`
    SELECT id_actividad_catalogo, codigo_actividad, descripcion_actividad 
    FROM catalogo_actividades 
    WHERE activo = true 
    ORDER BY id_actividad_catalogo 
    LIMIT 5
  `;
  if (actividades.length < 3) { console.log('❌ No hay suficientes actividades'); return; }
  console.log(`✅ Actividades para el plan: ${actividades.length}`);
  actividades.forEach((a, i) => console.log(`   ${i+1}. [${a.codigo_actividad}] ${a.descripcion_actividad?.substring(0, 50)}...`));

  // 7. Número de orden único
  const numeroOrden = `OS-CORR-PLAN-${Date.now().toString().slice(-6)}`;
  console.log(`\n📋 Creando orden: ${numeroOrden}`);

  // 8. Eliminar orden anterior si existe
  await prisma.$executeRaw`
    DELETE FROM ordenes_actividades_plan 
    WHERE id_orden_servicio IN (
      SELECT id_orden_servicio FROM ordenes_servicio WHERE numero_orden LIKE 'OS-CORR-PLAN-%'
    )
  `;
  await prisma.$executeRaw`DELETE FROM ordenes_servicio WHERE numero_orden LIKE 'OS-CORR-PLAN-%'`;
  console.log('🗑️  Limpieza previa completada');

  // 9. Crear la orden correctiva
  await prisma.$executeRaw`
    INSERT INTO ordenes_servicio (
      numero_orden, id_cliente, id_equipo, id_tipo_servicio, id_estado_actual,
      id_tecnico_asignado, fecha_programada, descripcion_inicial, prioridad,
      origen_solicitud, creado_por, fecha_creacion
    ) VALUES (
      ${numeroOrden}, ${cliente.id_cliente}, ${equipo.id_equipo}, 
      ${tipoServicio.id_tipo_servicio}, ${estadoAsignada.id_estado},
      ${empleado.id_empleado}, CURRENT_DATE, 
      'ORDEN CORRECTIVA DE PRUEBA - Plan de actividades personalizado (5 actividades específicas)',
      'ALTA', 'PROGRAMADO', 1, NOW()
    )
  `;

  // 10. Obtener ID de la orden creada
  const ordenCreada = await prisma.$queryRaw<any[]>`
    SELECT id_orden_servicio FROM ordenes_servicio WHERE numero_orden = ${numeroOrden}
  `;
  const idOrden = ordenCreada[0].id_orden_servicio;
  console.log(`✅ Orden creada con ID: ${idOrden}`);

  // 11. Asignar plan de actividades
  for (let i = 0; i < actividades.length; i++) {
    await prisma.$executeRaw`
      INSERT INTO ordenes_actividades_plan (
        id_orden_servicio, id_actividad_catalogo, orden_secuencia, 
        origen, es_obligatoria, creado_por, fecha_creacion
      ) VALUES (
        ${idOrden}, ${actividades[i].id_actividad_catalogo}, ${i + 1},
        'ADMIN', true, ${empleado.id_empleado}, NOW()
      )
    `;
  }
  console.log(`✅ Plan de actividades asignado: ${actividades.length} actividades`);

  // 12. Verificar
  const planVerificado = await prisma.$queryRaw<any[]>`
    SELECT p.orden_secuencia, a.codigo_actividad, a.descripcion_actividad
    FROM ordenes_actividades_plan p
    JOIN catalogo_actividades a ON p.id_actividad_catalogo = a.id_actividad_catalogo
    WHERE p.id_orden_servicio = ${idOrden}
    ORDER BY p.orden_secuencia
  `;

  console.log('\n' + '='.repeat(70));
  console.log('  ✅ ORDEN CORRECTIVA CON PLAN CREADA EXITOSAMENTE');
  console.log('='.repeat(70));
  console.log(`   Número: ${numeroOrden}`);
  console.log(`   ID Orden: ${idOrden}`);
  console.log(`   Tipo: ${tipoServicio.nombre_tipo}`);
  console.log(`   Equipo: ${equipo.codigo_equipo}`);
  console.log(`   Actividades en plan: ${planVerificado.length}`);
  console.log('\n   📋 ACTIVIDADES DEL PLAN:');
  planVerificado.forEach((p) => {
    console.log(`      ${p.orden_secuencia}. [${p.codigo_actividad}] ${p.descripcion_actividad?.substring(0, 50)}...`);
  });
  console.log('\n   ℹ️  PRÓXIMOS PASOS:');
  console.log('      1. Sincronizar en la app móvil');
  console.log('      2. Buscar la orden y ejecutarla');
  console.log('      3. Verificar que solo aparecen 5 actividades (no el catálogo completo)');
  console.log('='.repeat(70) + '\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
