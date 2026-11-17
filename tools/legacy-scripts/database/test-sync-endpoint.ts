/**
 * Test directo del endpoint de sync para verificar que ordenesEquipos se envía correctamente
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TECNICO_ID = 6;

async function main() {
  console.log('='.repeat(70));
  console.log('🔬 TEST: Verificar respuesta REAL del sync para técnico', TECNICO_ID);
  console.log('='.repeat(70));

  // Simular la query del sync.service.ts EXACTAMENTE como lo hace el backend
  const treintaDiasAtras = new Date();
  treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

  const ordenes = await prisma.ordenes_servicio.findMany({
    where: {
      id_tecnico_asignado: TECNICO_ID,
      OR: [
        { estados_orden: { es_estado_final: false } },
        {
          estados_orden: { es_estado_final: true },
          fecha_fin_real: { gte: treintaDiasAtras },
        },
      ],
    },
    include: {
      estados_orden: true,
      ordenes_actividades_plan: { orderBy: { orden_secuencia: 'asc' } },
      clientes: { include: { persona: true } },
      sedes_cliente: true,
      equipos: true,
      tipos_servicio: true,
      ordenes_equipos: {
        include: { equipos: true },
        orderBy: { orden_secuencia: 'asc' },
      },
      informes: { orderBy: { fecha_generacion: 'desc' }, take: 1 },
    },
    orderBy: [{ prioridad: 'desc' }, { fecha_programada: 'asc' }],
  });

  console.log(`\n📋 Total órdenes encontradas: ${ordenes.length}\n`);

  for (const o of ordenes) {
    const ordenesEquiposCount = o.ordenes_equipos?.length ?? 0;
    const icon = ordenesEquiposCount > 1 ? '🔧' : '📄';
    
    console.log(`${icon} ${o.numero_orden} (ID: ${o.id_orden_servicio})`);
    console.log(`   Estado: ${o.estados_orden?.codigo_estado}`);
    console.log(`   ordenesEquipos.length: ${ordenesEquiposCount}`);
    
    // Simular el mapeo exacto del sync.service.ts
    const ordenesEquiposMappped = o.ordenes_equipos?.map((oe) => ({
      idOrdenEquipo: oe.id_orden_equipo,
      idOrdenServicio: oe.id_orden_servicio,
      idEquipo: oe.id_equipo,
      ordenSecuencia: oe.orden_secuencia,
      nombreSistema: oe.nombre_sistema || undefined,
      estado: oe.estado || 'PENDIENTE',
      fechaInicio: oe.fecha_inicio?.toISOString(),
      fechaFin: oe.fecha_fin?.toISOString(),
      observaciones: oe.observaciones || undefined,
      codigoEquipo: oe.equipos?.codigo_equipo || '',
      nombreEquipo: oe.equipos?.nombre_equipo || '',
      ubicacionEquipo: oe.equipos?.ubicacion_texto || undefined,
    })) || [];

    console.log(`   ordenesEquipos (mapped): ${JSON.stringify(ordenesEquiposMappped.length > 0 ? ordenesEquiposMappped : 'VACÍO')}`);
    console.log('');
  }

  // Verificar específicamente las órdenes multi-equipo
  console.log('='.repeat(70));
  console.log('📊 RESUMEN MULTI-EQUIPOS:');
  console.log('='.repeat(70));

  const multiEquipos = ordenes.filter(o => (o.ordenes_equipos?.length ?? 0) > 1);
  console.log(`\nÓrdenes con 2+ equipos: ${multiEquipos.length}`);
  
  for (const o of multiEquipos) {
    console.log(`  - ${o.numero_orden}: ${o.ordenes_equipos?.length} equipos`);
    for (const oe of o.ordenes_equipos ?? []) {
      console.log(`      [${oe.orden_secuencia}] ${oe.nombre_sistema} → ${oe.equipos?.nombre_equipo}`);
    }
  }

  if (multiEquipos.length === 0) {
    console.log('\n⚠️  PROBLEMA: No hay órdenes multi-equipo para el técnico', TECNICO_ID);
    console.log('   Verificar que las órdenes OS-ME-3BOM-334804, OS-ME-4GEN-334804, OS-ME-2BOM-334805');
    console.log('   tengan id_tecnico_asignado =', TECNICO_ID);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
