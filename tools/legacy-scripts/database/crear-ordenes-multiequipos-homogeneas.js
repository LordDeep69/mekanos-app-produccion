/**
 * Script Enterprise para crear órdenes multi-equipos HOMOGÉNEAS
 * 
 * PRINCIPIOS DE DISEÑO:
 * 1. Equipos del MISMO TIPO (todas bombas O todos generadores)
 * 2. Mismo tipo de servicio aplicable al tipo de equipo
 * 3. Un solo informe PDF consolidado por orden
 * 4. Mismo cliente para todos los equipos
 * 
 * CASOS DE USO REALES:
 * - Cliente tiene 3 bombas similares y necesita mantenimiento preventivo tipo A a todas
 * - Cliente tiene 4 generadores y necesita inspección tipo B a todos
 * - Se emite UN SOLO informe con el trabajo realizado en todos los equipos
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 CREACIÓN DE ÓRDENES MULTI-EQUIPOS HOMOGÉNEAS');
  console.log('='.repeat(60));
  console.log('\n📋 Principios:');
  console.log('   ✓ Equipos del MISMO TIPO (homogéneos)');
  console.log('   ✓ Mismo tipo de servicio aplicable');
  console.log('   ✓ Un solo informe PDF consolidado');
  console.log('   ✓ Mismo cliente para coherencia\n');

  try {
    // =========================================================================
    // PASO 1: Obtener datos base necesarios
    // =========================================================================
    console.log('📊 PASO 1: Obteniendo datos base...\n');

    // Técnico activo
    const tecnico = await prisma.empleados.findFirst({
      where: { es_tecnico: true, empleado_activo: true }
    });
    if (!tecnico) throw new Error('No hay técnico activo');
    console.log(`   ✓ Técnico: ID ${tecnico.id_empleado}`);

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

    // Tipos de equipo activos
    const tiposEquipo = await prisma.tipos_equipo.findMany({
      where: { activo: true }
    });
    console.log(`   ✓ Tipos de equipo: ${tiposEquipo.length} encontrados`);
    tiposEquipo.forEach(t => console.log(`      - ID ${t.id_tipo_equipo}: ${t.nombre_tipo}`));

    // =========================================================================
    // PASO 2: Agrupar equipos por tipo Y cliente
    // =========================================================================
    console.log('\n📊 PASO 2: Agrupando equipos por tipo y cliente...\n');

    const equiposPorTipoYCliente = {};
    
    for (const tipo of tiposEquipo) {
      const equipos = await prisma.equipos.findMany({
        where: { 
          id_tipo_equipo: tipo.id_tipo_equipo, 
          activo: true 
        },
        include: {
          clientes: {
            include: { persona: true }
          }
        },
        orderBy: { id_cliente: 'asc' }
      });

      // Agrupar por cliente
      for (const eq of equipos) {
        const key = `${tipo.id_tipo_equipo}_${eq.id_cliente}`;
        if (!equiposPorTipoYCliente[key]) {
          equiposPorTipoYCliente[key] = {
            idTipoEquipo: tipo.id_tipo_equipo,
            nombreTipo: tipo.nombre_tipo,
            idCliente: eq.id_cliente,
            nombreCliente: eq.clientes?.persona?.nombre_comercial || 
                          eq.clientes?.persona?.nombre_completo || 
                          `Cliente ${eq.id_cliente}`,
            equipos: []
          };
        }
        equiposPorTipoYCliente[key].equipos.push(eq);
      }
    }

    // Filtrar solo grupos con 2+ equipos (candidatos a multi-equipo)
    const gruposMultiEquipo = Object.values(equiposPorTipoYCliente)
      .filter(g => g.equipos.length >= 2)
      .sort((a, b) => b.equipos.length - a.equipos.length);

    console.log(`   ✓ Grupos con 2+ equipos homogéneos: ${gruposMultiEquipo.length}`);
    gruposMultiEquipo.slice(0, 5).forEach(g => {
      console.log(`      - ${g.nombreTipo} @ ${g.nombreCliente}: ${g.equipos.length} equipos`);
    });

    if (gruposMultiEquipo.length === 0) {
      throw new Error('No hay suficientes equipos homogéneos del mismo cliente');
    }

    // =========================================================================
    // PASO 3: Obtener tipos de servicio aplicables
    // =========================================================================
    console.log('\n📊 PASO 3: Obteniendo tipos de servicio...\n');

    const tiposServicio = await prisma.tipos_servicio.findMany({
      where: { activo: true },
      orderBy: { nombre_tipo: 'asc' }
    });
    console.log(`   ✓ Tipos de servicio: ${tiposServicio.length} encontrados`);
    tiposServicio.slice(0, 8).forEach(s => {
      console.log(`      - ID ${s.id_tipo_servicio}: ${s.nombre_tipo} (${s.categoria || 'SIN_CATEGORIA'})`);
    });

    // =========================================================================
    // PASO 4: Limpiar órdenes multi-equipo anteriores
    // =========================================================================
    console.log('\n📊 PASO 4: Limpiando órdenes multi-equipo anteriores...\n');

    const ordenesAnteriores = await prisma.ordenes_servicio.findMany({
      where: { numero_orden: { startsWith: 'OS-ME-' } },
      select: { id_orden_servicio: true, numero_orden: true }
    });

    if (ordenesAnteriores.length > 0) {
      console.log(`   ⚠️ Encontradas ${ordenesAnteriores.length} órdenes anteriores OS-ME-*`);
      
      // Eliminar registros relacionados
      for (const orden of ordenesAnteriores) {
        await prisma.ordenes_equipos.deleteMany({
          where: { id_orden_servicio: orden.id_orden_servicio }
        });
        await prisma.ordenes_actividades_plan.deleteMany({
          where: { id_orden_servicio: orden.id_orden_servicio }
        });
      }
      
      // Eliminar órdenes
      await prisma.ordenes_servicio.deleteMany({
        where: { numero_orden: { startsWith: 'OS-ME-' } }
      });
      console.log(`   ✓ Eliminadas ${ordenesAnteriores.length} órdenes y sus relaciones`);
    } else {
      console.log(`   ✓ No hay órdenes anteriores que limpiar`);
    }

    // =========================================================================
    // PASO 5: Crear nuevas órdenes multi-equipo homogéneas
    // =========================================================================
    console.log('\n📊 PASO 5: Creando órdenes multi-equipo homogéneas...\n');

    const ordenesCreadas = [];
    const configuraciones = [
      { cantEquipos: 2, prioridad: 'NORMAL' },
      { cantEquipos: 3, prioridad: 'ALTA' },
      { cantEquipos: 4, prioridad: 'NORMAL' },
      { cantEquipos: 2, prioridad: 'URGENTE' },
      { cantEquipos: 5, prioridad: 'ALTA' },
      { cantEquipos: 3, prioridad: 'NORMAL' },
    ];

    let ordenIndex = 0;
    for (const grupo of gruposMultiEquipo) {
      if (ordenIndex >= configuraciones.length) break;

      const config = configuraciones[ordenIndex];
      const equiposParaOrden = grupo.equipos.slice(0, config.cantEquipos);
      
      if (equiposParaOrden.length < config.cantEquipos) {
        // Si no hay suficientes equipos, usar los disponibles
        if (equiposParaOrden.length < 2) continue;
      }

      // Buscar tipo de servicio compatible con el tipo de equipo
      let tipoServicioOrden = tiposServicio.find(ts => 
        ts.id_tipo_equipo === grupo.idTipoEquipo
      ) || tiposServicio.find(ts => 
        ts.id_tipo_equipo === null // Servicio genérico
      ) || tiposServicio[0];

      const timestamp = Date.now() + ordenIndex;
      const codigoTipo = grupo.nombreTipo.substring(0, 3).toUpperCase();
      const numOrden = `OS-ME-${equiposParaOrden.length}${codigoTipo}-${timestamp.toString().slice(-6)}`;

      console.log(`\n   📋 Orden ${ordenIndex + 1}: ${numOrden}`);
      console.log(`      Tipo equipo: ${grupo.nombreTipo}`);
      console.log(`      Cliente: ${grupo.nombreCliente}`);
      console.log(`      Servicio: ${tipoServicioOrden.nombre_tipo}`);
      console.log(`      Equipos: ${equiposParaOrden.length}`);

      // Crear la orden
      const orden = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: numOrden,
          id_tipo_servicio: tipoServicioOrden.id_tipo_servicio,
          id_cliente: grupo.idCliente,
          id_equipo: equiposParaOrden[0].id_equipo, // Equipo principal (legacy)
          id_tecnico_asignado: tecnico.id_empleado,
          id_estado_actual: estadoAsignada.id_estado,
          prioridad: config.prioridad,
          fecha_programada: new Date(Date.now() + (ordenIndex + 1) * 86400000),
          descripcion_inicial: `Mantenimiento ${tipoServicioOrden.nombre_tipo} para ${equiposParaOrden.length} ${grupo.nombreTipo}(s) - ${grupo.nombreCliente}`,
          creado_por: usuario.id_usuario,
          metadata: { 
            es_multiequipo: true,
            cantidad_equipos: equiposParaOrden.length,
            tipo_equipo: grupo.nombreTipo,
            cliente: grupo.nombreCliente,
            equipos_homogeneos: true
          }
        }
      });

      console.log(`      ✓ Orden creada: ID ${orden.id_orden_servicio}`);

      // Crear registros en ordenes_equipos
      for (let i = 0; i < equiposParaOrden.length; i++) {
        const eq = equiposParaOrden[i];
        const ordenEquipo = await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden.id_orden_servicio,
            id_equipo: eq.id_equipo,
            orden_secuencia: i + 1,
            nombre_sistema: eq.nombre_equipo || `${grupo.nombreTipo} ${i + 1}`,
            estado: 'PENDIENTE',
            metadata: { 
              codigo_equipo: eq.codigo_equipo,
              ubicacion: eq.ubicacion_texto
            }
          }
        });
        console.log(`      ✓ Equipo ${i + 1}: ${eq.codigo_equipo} - ${eq.nombre_equipo} (OE: ${ordenEquipo.id_orden_equipo})`);
      }

      // Asignar plan de actividades (del catálogo para ese tipo de servicio)
      const actividadesCatalogo = await prisma.catalogo_actividades.findMany({
        where: { 
          id_tipo_servicio: tipoServicioOrden.id_tipo_servicio,
          activo: true 
        },
        orderBy: { orden_ejecucion: 'asc' }
      });

      if (actividadesCatalogo.length > 0) {
        for (let i = 0; i < actividadesCatalogo.length; i++) {
          await prisma.ordenes_actividades_plan.create({
            data: {
              id_orden_servicio: orden.id_orden_servicio,
              id_actividad_catalogo: actividadesCatalogo[i].id_actividad_catalogo,
              orden_secuencia: i + 1,
              origen: 'AUTOMATICO',
              es_obligatoria: actividadesCatalogo[i].es_obligatoria
            }
          });
        }
        console.log(`      ✓ Plan: ${actividadesCatalogo.length} actividades asignadas`);
      }

      ordenesCreadas.push({
        id: orden.id_orden_servicio,
        numero: numOrden,
        tipoEquipo: grupo.nombreTipo,
        cliente: grupo.nombreCliente,
        cantEquipos: equiposParaOrden.length,
        servicio: tipoServicioOrden.nombre_tipo,
        actividades: actividadesCatalogo.length
      });

      ordenIndex++;
    }

    // =========================================================================
    // RESUMEN FINAL
    // =========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 RESUMEN DE ÓRDENES CREADAS');
    console.log('='.repeat(60));
    
    ordenesCreadas.forEach((o, i) => {
      console.log(`\n${i + 1}. ${o.numero}`);
      console.log(`   Tipo equipo: ${o.tipoEquipo}`);
      console.log(`   Cliente: ${o.cliente}`);
      console.log(`   Equipos: ${o.cantEquipos}`);
      console.log(`   Servicio: ${o.servicio}`);
      console.log(`   Actividades: ${o.actividades}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ TOTAL: ${ordenesCreadas.length} órdenes multi-equipo homogéneas creadas`);
    console.log('='.repeat(60));
    console.log('\n📱 Sincroniza la app móvil para ver las nuevas órdenes.\n');

  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    console.error(e.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
