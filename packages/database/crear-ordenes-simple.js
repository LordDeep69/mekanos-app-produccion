/**
 * Script SIMPLIFICADO para crear órdenes multi-equipos homogéneas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creando órdenes multi-equipos homogéneas...\n');

  try {
    // 1. Datos base
    const tecnico = await prisma.empleados.findFirst({ where: { es_tecnico: true, empleado_activo: true } });
    const usuario = await prisma.usuarios.findFirst({ where: { estado: 'ACTIVO' } });
    const estadoAsignada = await prisma.estados_orden.findFirst({ where: { codigo_estado: 'ASIGNADA' } });
    
    console.log('✓ Técnico ID:', tecnico.id_empleado);
    console.log('✓ Usuario ID:', usuario.id_usuario);
    console.log('✓ Estado ID:', estadoAsignada.id_estado);

    // 2. Buscar equipos del mismo tipo y cliente
    // Usar tipo BOMBA (id=2) ya que hay varios
    const equiposBomba = await prisma.equipos.findMany({
      where: { id_tipo_equipo: 2, activo: true },
      take: 10
    });
    console.log('✓ Bombas encontradas:', equiposBomba.length);

    // Usar tipo GENERADOR (id=1)
    const equiposGen = await prisma.equipos.findMany({
      where: { id_tipo_equipo: 1, activo: true },
      take: 10
    });
    console.log('✓ Generadores encontrados:', equiposGen.length);

    // 3. Tipo de servicio genérico
    const tipoServicio = await prisma.tipos_servicio.findFirst({ where: { activo: true } });
    console.log('✓ Tipo servicio:', tipoServicio.nombre_tipo);

    // 4. Crear órdenes
    const timestamp = Date.now().toString().slice(-6);
    const ordenesCreadas = [];

    // Orden con 3 bombas
    if (equiposBomba.length >= 3) {
      const orden1 = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: `OS-ME-3BOM-${timestamp}`,
          id_tipo_servicio: tipoServicio.id_tipo_servicio,
          id_cliente: equiposBomba[0].id_cliente,
          id_equipo: equiposBomba[0].id_equipo,
          id_tecnico_asignado: tecnico.id_empleado,
          id_estado_actual: estadoAsignada.id_estado,
          prioridad: 'ALTA',
          fecha_programada: new Date(Date.now() + 86400000),
          descripcion_inicial: 'Mantenimiento 3 BOMBAS homogéneas',
          creado_por: usuario.id_usuario,
          metadata: { es_multiequipo: true, equipos_homogeneos: true }
        }
      });
      console.log('✓ Orden bombas creada:', orden1.id_orden_servicio);

      // Crear equipos asociados
      for (let i = 0; i < 3; i++) {
        await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden1.id_orden_servicio,
            id_equipo: equiposBomba[i].id_equipo,
            orden_secuencia: i + 1,
            nombre_sistema: `Bomba ${i + 1}`,
            estado: 'PENDIENTE'
          }
        });
      }
      console.log('  ✓ 3 equipos asignados');
      ordenesCreadas.push(orden1.numero_orden);
    }

    // Orden con 4 generadores
    if (equiposGen.length >= 4) {
      const orden2 = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: `OS-ME-4GEN-${timestamp}`,
          id_tipo_servicio: tipoServicio.id_tipo_servicio,
          id_cliente: equiposGen[0].id_cliente,
          id_equipo: equiposGen[0].id_equipo,
          id_tecnico_asignado: tecnico.id_empleado,
          id_estado_actual: estadoAsignada.id_estado,
          prioridad: 'NORMAL',
          fecha_programada: new Date(Date.now() + 2*86400000),
          descripcion_inicial: 'Mantenimiento 4 GENERADORES homogéneos',
          creado_por: usuario.id_usuario,
          metadata: { es_multiequipo: true, equipos_homogeneos: true }
        }
      });
      console.log('✓ Orden generadores creada:', orden2.id_orden_servicio);

      for (let i = 0; i < 4; i++) {
        await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden2.id_orden_servicio,
            id_equipo: equiposGen[i].id_equipo,
            orden_secuencia: i + 1,
            nombre_sistema: `Generador ${i + 1}`,
            estado: 'PENDIENTE'
          }
        });
      }
      console.log('  ✓ 4 equipos asignados');
      ordenesCreadas.push(orden2.numero_orden);
    }

    // Orden con 2 bombas
    if (equiposBomba.length >= 5) {
      const orden3 = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: `OS-ME-2BOM-${parseInt(timestamp)+1}`,
          id_tipo_servicio: tipoServicio.id_tipo_servicio,
          id_cliente: equiposBomba[3].id_cliente,
          id_equipo: equiposBomba[3].id_equipo,
          id_tecnico_asignado: tecnico.id_empleado,
          id_estado_actual: estadoAsignada.id_estado,
          prioridad: 'URGENTE',
          fecha_programada: new Date(Date.now() + 3*86400000),
          descripcion_inicial: 'Mantenimiento 2 BOMBAS homogéneas',
          creado_por: usuario.id_usuario,
          metadata: { es_multiequipo: true, equipos_homogeneos: true }
        }
      });
      console.log('✓ Orden 2 bombas creada:', orden3.id_orden_servicio);

      for (let i = 3; i < 5; i++) {
        await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden3.id_orden_servicio,
            id_equipo: equiposBomba[i].id_equipo,
            orden_secuencia: i - 2,
            nombre_sistema: `Bomba ${i - 2}`,
            estado: 'PENDIENTE'
          }
        });
      }
      console.log('  ✓ 2 equipos asignados');
      ordenesCreadas.push(orden3.numero_orden);
    }

    console.log('\n✅ CREADAS:', ordenesCreadas.length, 'órdenes');
    ordenesCreadas.forEach(n => console.log('  -', n));

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
