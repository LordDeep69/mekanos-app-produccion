/**
 * Script para crear 10 órdenes multi-equipo de BOMBAS
 * - Exactamente 2 equipos por orden
 * - Tipo de servicio: Preventivo Tipo A - Bomba
 * - Asignadas al empleado ID 6
 * - SIN borrar órdenes existentes
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 CREACIÓN DE 10 ÓRDENES MULTI-EQUIPO DE BOMBAS');
  console.log('='.repeat(60));
  console.log('\n📋 Configuración:');
  console.log('   ✓ Tipo de equipo: BOMBA');
  console.log('   ✓ Equipos por orden: 2');
  console.log('   ✓ Tipo servicio: Preventivo Tipo A - Bomba');
  console.log('   ✓ Técnico asignado: ID 6\n');

  try {
    // =========================================================================
    // PASO 1: Obtener datos base necesarios
    // =========================================================================
    console.log('📊 PASO 1: Obteniendo datos base...\n');

    // Técnico específico (ID 6)
    const tecnico = await prisma.empleados.findUnique({
      where: { id_empleado: 6 },
      include: { persona: true }
    });
    if (!tecnico) throw new Error('No existe el empleado con ID 6');
    const nombreTecnico = tecnico.persona?.nombre_completo || tecnico.codigo_empleado || `Empleado ${tecnico.id_empleado}`;
    console.log(`   ✓ Técnico: ID ${tecnico.id_empleado} - ${nombreTecnico}`);

    // Usuario para auditoría
    const usuario = await prisma.usuarios.findFirst({
      where: { estado: 'ACTIVO' }
    });
    if (!usuario) throw new Error('No hay usuario activo');
    console.log(`   ✓ Usuario creador: ID ${usuario.id_usuario}`);

    // Estado ASIGNADA
    const estadoAsignada = await prisma.estados_orden.findFirst({
      where: { codigo_estado: 'ASIGNADA' }
    });
    if (!estadoAsignada) throw new Error('No hay estado ASIGNADA');
    console.log(`   ✓ Estado ASIGNADA: ID ${estadoAsignada.id_estado}`);

    // Tipo de equipo BOMBA
    const tipoBomba = await prisma.tipos_equipo.findFirst({
      where: { 
        OR: [
          { nombre_tipo: { contains: 'BOMBA', mode: 'insensitive' } },
          { nombre_tipo: { contains: 'Bomba', mode: 'insensitive' } }
        ],
        activo: true 
      }
    });
    if (!tipoBomba) throw new Error('No existe tipo de equipo BOMBA');
    console.log(`   ✓ Tipo equipo: ID ${tipoBomba.id_tipo_equipo} - ${tipoBomba.nombre_tipo}`);

    // Tipo de servicio "Preventivo Tipo A" para BOMBA
    const tipoServicio = await prisma.tipos_servicio.findFirst({
      where: {
        OR: [
          { nombre_tipo: { contains: 'Preventivo Tipo A', mode: 'insensitive' } },
          { codigo_tipo: { contains: 'PREV_A', mode: 'insensitive' } }
        ],
        id_tipo_equipo: tipoBomba.id_tipo_equipo,
        activo: true
      }
    });
    
    // Si no hay específico para bomba, buscar genérico
    const tipoServicioFinal = tipoServicio || await prisma.tipos_servicio.findFirst({
      where: {
        nombre_tipo: { contains: 'Preventivo Tipo A', mode: 'insensitive' },
        activo: true
      }
    });
    
    if (!tipoServicioFinal) throw new Error('No existe tipo de servicio Preventivo Tipo A');
    console.log(`   ✓ Tipo servicio: ID ${tipoServicioFinal.id_tipo_servicio} - ${tipoServicioFinal.nombre_tipo}`);

    // =========================================================================
    // PASO 2: Obtener equipos tipo BOMBA
    // =========================================================================
    console.log('\n📊 PASO 2: Obteniendo equipos tipo BOMBA...\n');

    const equiposBomba = await prisma.equipos.findMany({
      where: {
        id_tipo_equipo: tipoBomba.id_tipo_equipo,
        activo: true
      },
      include: {
        clientes: {
          include: { persona: true }
        }
      },
      orderBy: { id_equipo: 'asc' }
    });

    console.log(`   ✓ Equipos BOMBA encontrados: ${equiposBomba.length}`);
    
    if (equiposBomba.length < 2) {
      throw new Error('Se necesitan al menos 2 bombas para crear órdenes multi-equipo');
    }
    
    if (equiposBomba.length < 20) {
      console.log(`   ⚠️ Se reutilizarán equipos si es necesario`);
    }

    // =========================================================================
    // PASO 3: Obtener actividades del catálogo para este tipo de servicio
    // =========================================================================
    console.log('\n📊 PASO 3: Obteniendo actividades del catálogo...\n');

    const actividadesCatalogo = await prisma.catalogo_actividades.findMany({
      where: {
        id_tipo_servicio: tipoServicioFinal.id_tipo_servicio,
        activo: true
      },
      orderBy: { orden_ejecucion: 'asc' }
    });

    console.log(`   ✓ Actividades en catálogo: ${actividadesCatalogo.length}`);

    // =========================================================================
    // PASO 4: Crear 10 órdenes multi-equipo de 2 bombas cada una
    // =========================================================================
    console.log('\n📊 PASO 4: Creando 10 órdenes multi-equipo...\n');

    const ordenesCreadas = [];
    const timestamp = Date.now().toString().slice(-6);

    for (let i = 0; i < 10; i++) {
      // Seleccionar 2 equipos (reutilizando si no hay suficientes)
      const idx1 = (i * 2) % equiposBomba.length;
      const idx2 = (i * 2 + 1) % equiposBomba.length;
      const equipo1 = equiposBomba[idx1];
      const equipo2 = equiposBomba[idx2];

      const numOrden = `OS-ME-BOM2-${timestamp}-${String(i + 1).padStart(3, '0')}`;
      const cliente = equipo1.clientes;
      const nombreCliente = cliente?.persona?.nombre_comercial || 
                           cliente?.persona?.nombre_completo || 
                           `Cliente ${equipo1.id_cliente}`;

      console.log(`\n   📋 Orden ${i + 1}: ${numOrden}`);

      // Crear la orden
      const orden = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: numOrden,
          id_tipo_servicio: tipoServicioFinal.id_tipo_servicio,
          id_cliente: equipo1.id_cliente,
          id_equipo: equipo1.id_equipo, // Equipo principal (legacy)
          id_tecnico_asignado: 6, // Empleado ID 6
          id_estado_actual: estadoAsignada.id_estado,
          prioridad: ['NORMAL', 'ALTA', 'URGENTE'][i % 3],
          fecha_programada: new Date(Date.now() + (i + 1) * 86400000), // +1 día por cada orden
          descripcion_inicial: `Mantenimiento Preventivo Tipo A para 2 Bombas - ${nombreCliente}`,
          creado_por: usuario.id_usuario,
          metadata: { 
            es_multiequipo: true,
            cantidad_equipos: 2,
            tipo_equipo: 'BOMBA',
            cliente: nombreCliente,
            equipos_homogeneos: true
          }
        }
      });

      console.log(`      ✓ Orden creada: ID ${orden.id_orden_servicio}`);

      // Crear registros en ordenes_equipos para los 2 equipos
      const equiposParaOrden = [equipo1, equipo2];
      for (let j = 0; j < equiposParaOrden.length; j++) {
        const eq = equiposParaOrden[j];
        const ordenEquipo = await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden.id_orden_servicio,
            id_equipo: eq.id_equipo,
            orden_secuencia: j + 1,
            nombre_sistema: eq.nombre_equipo || `Bomba ${j + 1}`,
            estado: 'PENDIENTE',
            metadata: { 
              codigo_equipo: eq.codigo_equipo,
              ubicacion: eq.ubicacion_texto
            }
          }
        });
        console.log(`      ✓ Equipo ${j + 1}: ${eq.codigo_equipo || 'N/A'} - ${eq.nombre_equipo || 'Sin nombre'} (OE: ${ordenEquipo.id_orden_equipo})`);
      }

      // Asignar plan de actividades
      if (actividadesCatalogo.length > 0) {
        await prisma.ordenes_actividades_plan.createMany({
          data: actividadesCatalogo.map((a, index) => ({
            id_orden_servicio: orden.id_orden_servicio,
            id_actividad_catalogo: a.id_actividad_catalogo,
            orden_secuencia: a.orden_ejecucion ?? index + 1,
            origen: 'ADMIN',
            es_obligatoria: a.es_obligatoria ?? true,
            creado_por: usuario.id_usuario
          })),
          skipDuplicates: true
        });
        console.log(`      ✓ Plan: ${actividadesCatalogo.length} actividades asignadas`);
      }

      ordenesCreadas.push({
        id: orden.id_orden_servicio,
        numero: numOrden,
        cliente: nombreCliente,
        equipos: equiposParaOrden.map(e => e.codigo_equipo)
      });
    }

    // =========================================================================
    // RESUMEN FINAL
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ RESUMEN DE ÓRDENES CREADAS');
    console.log('='.repeat(60) + '\n');

    console.log(`   Total órdenes: ${ordenesCreadas.length}`);
    console.log(`   Equipos por orden: 2`);
    console.log(`   Técnico asignado: ID 6 - ${nombreTecnico}\n`);

    console.log('   📋 Lista de órdenes:');
    ordenesCreadas.forEach((o, i) => {
      console.log(`      ${i + 1}. ${o.numero} - ${o.cliente}`);
      console.log(`         Equipos: ${o.equipos.join(', ')}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('\n❌ ERROR:');
    console.error(error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
