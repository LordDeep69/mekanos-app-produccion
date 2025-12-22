/**
 * Script ENTERPRISE para Multi-Equipos
 * 
 * FASE A: Corregir tipos de servicio de órdenes existentes
 * FASE B: Crear 20 nuevas órdenes multi-equipo para empleado 6
 * 
 * Tipos de servicio correctos:
 * - id_tipo_servicio = 5 (BOM_PREV_A): Preventivo Tipo A - Bomba (25 actividades)
 * - id_tipo_servicio = 3 (GEN_PREV_A): Preventivo Tipo A - Generador (42 actividades)
 */

import { PrismaClient, prioridad_enum } from '@prisma/client';

const prisma = new PrismaClient();
const TECNICO_ID = 6;
const prioridades: prioridad_enum[] = [prioridad_enum.ALTA, prioridad_enum.NORMAL, prioridad_enum.URGENTE];

async function main() {
  console.log('='.repeat(80));
  console.log('🏢 SCRIPT ENTERPRISE: MULTI-EQUIPOS');
  console.log('='.repeat(80));

  // =========================================================================
  // FASE A: CORREGIR TIPOS DE SERVICIO DE ÓRDENES EXISTENTES
  // =========================================================================
  console.log('\n📝 FASE A: Corregir tipos de servicio existentes...\n');

  // Corregir órdenes de BOMBAS → tipo 5 (BOM_PREV_A)
  const updateBombas = await prisma.ordenes_servicio.updateMany({
    where: {
      numero_orden: { in: ['OS-ME-3BOM-334804', 'OS-ME-2BOM-334805'] }
    },
    data: { id_tipo_servicio: 5 }
  });
  console.log(`✅ Órdenes BOMBAS actualizadas: ${updateBombas.count}`);

  // Corregir órdenes de GENERADORES → tipo 3 (GEN_PREV_A)
  const updateGeneradores = await prisma.ordenes_servicio.updateMany({
    where: {
      numero_orden: 'OS-ME-4GEN-334804'
    },
    data: { id_tipo_servicio: 3 }
  });
  console.log(`✅ Órdenes GENERADORES actualizadas: ${updateGeneradores.count}`);

  // =========================================================================
  // FASE B: CREAR 20 NUEVAS ÓRDENES MULTI-EQUIPO
  // =========================================================================
  console.log('\n📝 FASE B: Crear 20 nuevas órdenes multi-equipo...\n');

  // Obtener datos necesarios
  const clientes = await prisma.clientes.findMany({ take: 5, include: { persona: true } });
  const equiposBomba = await prisma.equipos.findMany({ 
    where: { id_tipo_equipo: 2 }, // Bombas
    take: 10 
  });
  const equiposGenerador = await prisma.equipos.findMany({ 
    where: { id_tipo_equipo: 1 }, // Generadores
    take: 10 
  });
  const estadoAsignada = await prisma.estados_orden.findFirst({ where: { codigo_estado: 'ASIGNADA' } });

  if (!estadoAsignada) {
    throw new Error('Estado ASIGNADA no encontrado');
  }

  console.log(`📊 Datos disponibles:`);
  console.log(`   - Clientes: ${clientes.length}`);
  console.log(`   - Equipos Bomba: ${equiposBomba.length}`);
  console.log(`   - Equipos Generador: ${equiposGenerador.length}`);

  // Generar 20 órdenes
  const ordenesCreadas: { numero: string; tipo: string; equipos: number }[] = [];
  const fechaBase = new Date();

  for (let i = 1; i <= 20; i++) {
    const esBomba = i % 2 === 0; // Alternar: pares=bombas, impares=generadores
    const numEquipos = Math.min(2 + (i % 4), esBomba ? equiposBomba.length : equiposGenerador.length); // 2-5 equipos
    const cliente = clientes[i % clientes.length];
    const tipoServicio = esBomba ? 5 : 3; // BOM_PREV_A o GEN_PREV_A
    const prefijo = esBomba ? 'BOM' : 'GEN';
    const numeroOrden = `OS-ME-${prefijo}${numEquipos}-${Date.now().toString().slice(-6)}-${i.toString().padStart(3, '0')}`;
    const equiposDisponibles = esBomba ? equiposBomba : equiposGenerador;
    const equipoPrincipal = equiposDisponibles[0]; // Primer equipo como "principal"

    // Fecha programada: próximos 30 días
    const fechaProgramada = new Date(fechaBase);
    fechaProgramada.setDate(fechaProgramada.getDate() + i);

    // Crear orden
    const orden = await prisma.ordenes_servicio.create({
      data: {
        numero_orden: numeroOrden,
        id_cliente: cliente.id_cliente,
        id_equipo: equipoPrincipal.id_equipo, // Equipo principal (requerido por schema)
        id_tipo_servicio: tipoServicio,
        id_tecnico_asignado: TECNICO_ID,
        id_estado_actual: estadoAsignada.id_estado,
        fecha_programada: fechaProgramada,
        prioridad: prioridades[i % prioridades.length],
        descripcion_inicial: `Mantenimiento preventivo tipo A multi-equipo (${numEquipos} ${esBomba ? 'bombas' : 'generadores'})`,
        creado_por: 1, // Admin user
      }
    });

    // Crear registros en ordenes_equipos
    for (let j = 0; j < numEquipos; j++) {
      const equipo = equiposDisponibles[j % equiposDisponibles.length];
      await prisma.ordenes_equipos.create({
        data: {
          id_orden_servicio: orden.id_orden_servicio,
          id_equipo: equipo.id_equipo,
          orden_secuencia: j + 1,
          nombre_sistema: `${esBomba ? 'Bomba' : 'Generador'} ${j + 1}`,
          estado: 'PENDIENTE',
        }
      });
    }

    ordenesCreadas.push({ numero: numeroOrden, tipo: esBomba ? 'BOMBAS' : 'GENERADORES', equipos: numEquipos });
    console.log(`✅ [${i}/20] ${numeroOrden} - ${numEquipos} ${esBomba ? 'bombas' : 'generadores'}`);
  }

  // =========================================================================
  // RESUMEN FINAL
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📋 RESUMEN DE ÓRDENES CREADAS:');
  console.log('='.repeat(80));

  const bombasCount = ordenesCreadas.filter(o => o.tipo === 'BOMBAS').length;
  const generadoresCount = ordenesCreadas.filter(o => o.tipo === 'GENERADORES').length;
  const totalEquipos = ordenesCreadas.reduce((sum, o) => sum + o.equipos, 0);

  console.log(`\n📊 ESTADÍSTICAS:`);
  console.log(`   - Total órdenes creadas: ${ordenesCreadas.length}`);
  console.log(`   - Órdenes de BOMBAS: ${bombasCount} (tipo_servicio=5, 25 actividades)`);
  console.log(`   - Órdenes de GENERADORES: ${generadoresCount} (tipo_servicio=3, 42 actividades)`);
  console.log(`   - Total equipos asociados: ${totalEquipos}`);
  console.log(`   - Técnico asignado: ID ${TECNICO_ID}`);

  console.log('\n📋 LISTADO COMPLETO:');
  ordenesCreadas.forEach((o, i) => {
    console.log(`   ${(i+1).toString().padStart(2)}. ${o.numero} [${o.tipo}] - ${o.equipos} equipos`);
  });

  // Verificar todas las órdenes multi-equipo del técnico
  console.log('\n' + '='.repeat(80));
  console.log('📊 TODAS LAS ÓRDENES MULTI-EQUIPO DEL TÉCNICO 6:');
  console.log('='.repeat(80));

  const todasMultiEquipo = await prisma.$queryRaw`
    SELECT 
      o.numero_orden,
      o.id_tipo_servicio,
      ts.codigo_tipo,
      COUNT(oe.id_orden_equipo) as num_equipos
    FROM ordenes_servicio o
    JOIN ordenes_equipos oe ON o.id_orden_servicio = oe.id_orden_servicio
    JOIN tipos_servicio ts ON o.id_tipo_servicio = ts.id_tipo_servicio
    WHERE o.id_tecnico_asignado = ${TECNICO_ID}
    GROUP BY o.id_orden_servicio, ts.codigo_tipo
    HAVING COUNT(oe.id_orden_equipo) > 1
    ORDER BY num_equipos DESC
  ` as any[];

  console.log(`\nTotal: ${todasMultiEquipo.length} órdenes multi-equipo`);
  todasMultiEquipo.forEach((o: any) => {
    console.log(`   ${o.numero_orden} [${o.codigo_tipo}] - ${o.num_equipos} equipos`);
  });

  console.log('\n✅ SCRIPT COMPLETADO EXITOSAMENTE');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
