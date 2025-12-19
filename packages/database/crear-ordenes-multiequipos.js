/**
 * Script simplificado para crear 10 órdenes multi-equipos para testing E2E
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creando 10 órdenes multi-equipos...\n');

  try {
    // Obtener datos básicos necesarios
    const tecnico = await prisma.empleados.findFirst({
      where: { es_tecnico: true, empleado_activo: true }
    });
    if (!tecnico) throw new Error('No hay técnico activo');
    console.log(`✅ Técnico ID: ${tecnico.id_empleado}`);

    const equipos = await prisma.equipos.findMany({
      where: { activo: true },
      take: 30,
      select: { id_equipo: true, nombre_equipo: true, id_cliente: true }
    });
    if (equipos.length < 6) throw new Error('Necesita al menos 6 equipos');
    console.log(`✅ Equipos: ${equipos.length}`);

    const tipoServicio = await prisma.tipos_servicio.findFirst({
      where: { activo: true }
    });
    if (!tipoServicio) throw new Error('No hay tipo de servicio');
    console.log(`✅ Tipo servicio ID: ${tipoServicio.id_tipo_servicio}`);

    const idCliente = equipos[0].id_cliente;
    const contrato = await prisma.contratos_mantenimiento.findFirst({
      where: { id_cliente: idCliente, estado_contrato: 'ACTIVO' }
    });

    // Obtener un usuario para creado_por
    const usuario = await prisma.usuarios.findFirst({
      where: { estado: 'ACTIVO' }
    });
    if (!usuario) throw new Error('No hay usuario activo');
    console.log(`✅ Usuario creador ID: ${usuario.id_usuario}`);

    // Obtener estado ASIGNADA
    const estadoAsignada = await prisma.estados_orden.findFirst({
      where: { codigo_estado: 'ASIGNADA' }
    });
    if (!estadoAsignada) throw new Error('No hay estado ASIGNADA');
    console.log(`✅ Estado ASIGNADA ID: ${estadoAsignada.id_estado}`);

    // Configuraciones: cuántos equipos por orden
    const configs = [2, 3, 4, 2, 5, 3, 2, 4, 3, 6];
    const ordenesCreadas = [];

    for (let i = 0; i < 10; i++) {
      const cantEquipos = configs[i];
      const timestamp = Date.now() + i;
      const numOrden = `OS-ME-${cantEquipos}EQ-${timestamp.toString().slice(-6)}`;

      // Seleccionar equipos únicos para esta orden
      const equiposOrden = [];
      for (let j = 0; j < cantEquipos && j < equipos.length; j++) {
        const idx = (i * 3 + j) % equipos.length;
        if (!equiposOrden.find(e => e.id_equipo === equipos[idx].id_equipo)) {
          equiposOrden.push(equipos[idx]);
        }
      }
      // Completar si faltan
      for (let k = 0; equiposOrden.length < cantEquipos && k < equipos.length; k++) {
        if (!equiposOrden.find(e => e.id_equipo === equipos[k].id_equipo)) {
          equiposOrden.push(equipos[k]);
        }
      }

      // Crear orden
      const orden = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: numOrden,
          id_tipo_servicio: tipoServicio.id_tipo_servicio,
          id_cliente: idCliente,
          id_equipo: equiposOrden[0].id_equipo,
          id_tecnico_asignado: tecnico.id_empleado,
          id_estado_actual: estadoAsignada.id_estado,
          prioridad: i < 3 ? 'ALTA' : (i < 7 ? 'NORMAL' : 'URGENTE'),
          fecha_programada: new Date(Date.now() + i * 86400000),
          descripcion_inicial: `Orden MULTI-EQUIPOS ${cantEquipos}EQ para testing`,
          creado_por: usuario.id_usuario,
          metadata: { test: true, cantidad_equipos: cantEquipos, es_multiequipo: true }
        }
      });

      console.log(`\n📋 Orden ${i + 1}/10: ${numOrden} (${cantEquipos} equipos)`);

      // Crear ordenes_equipos
      for (let j = 0; j < equiposOrden.length; j++) {
        const eq = equiposOrden[j];
        const oe = await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden.id_orden_servicio,
            id_equipo: eq.id_equipo,
            orden_secuencia: j + 1,
            nombre_sistema: `Sistema ${j + 1}`,
            estado: 'PENDIENTE',
            metadata: { nombre_equipo: eq.nombre_equipo }
          }
        });
        console.log(`   ✓ Equipo ${j + 1}: ID ${eq.id_equipo} (OE: ${oe.id_orden_equipo})`);
      }

      ordenesCreadas.push({ id: orden.id_orden_servicio, num: numOrden, cant: cantEquipos });
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 RESUMEN:');
    ordenesCreadas.forEach((o, i) => console.log(`   ${i + 1}. ${o.num} - ${o.cant} equipos`));
    console.log('='.repeat(50));
    console.log(`\n✅ ${ordenesCreadas.length} órdenes creadas. Sincroniza la app para verlas.\n`);

  } catch (e) {
    console.error('❌', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
