/**
 * CREAR ORDEN REAL DE PRUEBA: OS-REAL-TEST-001
 * Para validación de RUTA 5 con escenario de alta fidelidad
 * 
 * Ejecutar: npx ts-node crear-orden-real-test.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  🔧 CREANDO ORDEN OS-REAL-TEST-001');
  console.log('='.repeat(70));

  // Primero, verificar si existe un empleado. Si no, crear uno temporal.
  const empleados = await prisma.$queryRaw<any[]>`SELECT id_empleado FROM empleados LIMIT 1`;
  let idEmpleado = empleados.length > 0 ? empleados[0].id_empleado : null;

  if (!idEmpleado) {
    console.log('⚠️  No hay empleados. Creando empleado temporal...');
    await prisma.$executeRaw`
            INSERT INTO empleados (id_persona, cargo, activo, fecha_creacion)
            VALUES (1, 'TECNICO', true, NOW())
            ON CONFLICT DO NOTHING
        `;
    const nuevoEmpleado = await prisma.$queryRaw<any[]>`SELECT id_empleado FROM empleados WHERE id_persona = 1`;
    idEmpleado = nuevoEmpleado[0]?.id_empleado;
    console.log('✅ Empleado creado con ID:', idEmpleado);
  } else {
    console.log('✅ Empleado encontrado con ID:', idEmpleado);
  }

  // Verificar si ya existe y eliminar
  await prisma.$executeRaw`
        DELETE FROM ordenes_servicio WHERE numero_orden = 'OS-REAL-TEST-001'
    `;
  console.log('✅ Limpieza previa completada');

  // Crear la orden con SQL directo - usando campos correctos del schema
  await prisma.$executeRaw`
        INSERT INTO ordenes_servicio (
            numero_orden,
            id_cliente,
            id_equipo,
            id_tipo_servicio,
            id_estado_actual,
            id_tecnico_asignado,
            fecha_programada,
            descripcion_inicial,
            prioridad,
            origen_solicitud,
            creado_por,
            fecha_creacion
        ) VALUES (
            'OS-REAL-TEST-001',
            1,                                    -- Empresa Test S.A.S.
            1,                                    -- EQ-TEST-001 (Generador Caterpillar)
            3,                                    -- GEN_PREV_A (42 actividades)
            1,                                    -- ASIGNADA (id_estado)
            ${idEmpleado},                        -- empleado ID
            '2025-12-05',
            'Mantenimiento preventivo Tipo A para generador Caterpillar 500KVA. Incluye revisión completa de 8 sistemas: Enfriamiento, Combustible, Lubricación, Aspiración, Escape, Eléctrico Motor, Módulo Control y General. 42 actividades a ejecutar.',
            'ALTA',
            'PROGRAMADO',
            1,
            NOW()
        )
    `;

  console.log('\n✅ ORDEN CREADA EXITOSAMENTE');

  // Verificar la orden creada
  const ordenCreada = await prisma.$queryRaw<any[]>`
    SELECT 
      o.id_orden_servicio,
      o.numero_orden,
      p.nombre_completo as cliente,
      e.codigo_equipo,
      e.nombre_equipo,
      ts.codigo_tipo,
      ts.nombre_tipo,
      est.codigo_estado,
      tec.nombre_completo as tecnico
    FROM ordenes_servicio o
    JOIN clientes c ON o.id_cliente = c.id_cliente
    JOIN personas p ON c.id_persona = p.id_persona
    JOIN equipos e ON o.id_equipo = e.id_equipo
    JOIN tipos_servicio ts ON o.id_tipo_servicio = ts.id_tipo_servicio
    JOIN estados_orden est ON o.id_estado_actual = est.id_estado
    LEFT JOIN empleados emp ON o.id_tecnico_asignado = emp.id_empleado
    LEFT JOIN personas tec ON emp.id_persona = tec.id_persona
    WHERE o.numero_orden = 'OS-REAL-TEST-001'
  `;

  if (ordenCreada.length > 0) {
    const o = ordenCreada[0];
    console.log('-'.repeat(60));
    console.log(`   ID Orden:        ${o.id_orden_servicio}`);
    console.log(`   Número:          ${o.numero_orden}`);
    console.log(`   Cliente:         ${o.cliente}`);
    console.log(`   Equipo:          ${o.codigo_equipo} - ${o.nombre_equipo}`);
    console.log(`   Tipo Servicio:   ${o.codigo_tipo} - ${o.nombre_tipo}`);
    console.log(`   Estado:          ${o.codigo_estado}`);
    console.log(`   Técnico:         ${o.tecnico}`);
  }

  // Verificar actividades del tipo de servicio
  const actividades = await prisma.$queryRaw<any[]>`
    SELECT 
      ca.id_actividad_catalogo,
      ca.descripcion_actividad,
      cs.nombre_sistema
    FROM catalogo_actividades ca
    LEFT JOIN catalogo_sistemas cs ON ca.id_sistema = cs.id_sistema
    WHERE ca.id_tipo_servicio = 3 AND ca.activo = true
    ORDER BY ca.id_sistema, ca.orden_ejecucion
  `;

  console.log(`\n📋 ACTIVIDADES VINCULADAS (via id_tipo_servicio=3):`);
  console.log('-'.repeat(60));
  console.log(`   Total: ${actividades.length} actividades`);

  // Agrupar por sistema
  const porSistema = new Map<string, number>();
  for (const act of actividades) {
    const sistema = act.nombre_sistema || 'Sin sistema';
    porSistema.set(sistema, (porSistema.get(sistema) || 0) + 1);
  }

  console.log('\n   Por Sistema:');
  for (const [sistema, count] of porSistema) {
    console.log(`   - ${sistema}: ${count}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  ✅ LISTO PARA SINCRONIZAR EN APP MOBILE');
  console.log('='.repeat(70));
  console.log(`
  PRÓXIMOS PASOS:
  1. En Flutter: Hot Restart (R)
  2. Presionar "SINCRONIZAR DATOS"
  3. Presionar "🧪 LOG TEST RUTA 5"
  4. Verificar que muestre OS-REAL-TEST-001 con >40 actividades
  `);

  await prisma.$disconnect();
}

main().catch(console.error);
