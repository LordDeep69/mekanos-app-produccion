import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(70));
  console.log('🔍 DIAGNÓSTICO: ÓRDENES MULTI-EQUIPO EN BD');
  console.log('='.repeat(70));
  
  // Órdenes específicas que deberían tener multi-equipos
  const ordenesMulti = ['OS-ME-3BOM-334804', 'OS-ME-4GEN-334804', 'OS-ME-2BOM-334805'];
  
  for (const numero of ordenesMulti) {
    const orden = await prisma.ordenes_servicio.findFirst({
      where: { numero_orden: numero },
      include: {
        ordenes_equipos: {
          include: { equipos: true },
          orderBy: { orden_secuencia: 'asc' }
        },
        estados_orden: true
      }
    });
    
    if (!orden) {
      console.log(`\n❌ ${numero}: NO ENCONTRADA`);
      continue;
    }
    
    console.log(`\n✅ ${numero} (ID: ${orden.id_orden_servicio})`);
    console.log(`   Técnico asignado: ${orden.id_tecnico_asignado}`);
    console.log(`   Estado: ${orden.estados_orden?.codigo_estado} (final: ${orden.estados_orden?.es_estado_final})`);
    console.log(`   Equipos en ordenes_equipos: ${orden.ordenes_equipos.length}`);
    
    if (orden.ordenes_equipos.length > 0) {
      orden.ordenes_equipos.forEach((oe, i) => {
        console.log(`   [${i+1}] idOrdenEquipo=${oe.id_orden_equipo}, nombreSistema="${oe.nombre_sistema}", equipo=${oe.equipos?.nombre_equipo}`);
      });
    }
  }
  
  // Verificar todas las órdenes con múltiples equipos
  console.log('\n' + '='.repeat(70));
  console.log('📊 TODAS LAS ÓRDENES CON 2+ EQUIPOS:');
  console.log('='.repeat(70));
  
  const ordenesConMulti = await prisma.ordenes_equipos.groupBy({
    by: ['id_orden_servicio'],
    _count: { id_orden_equipo: true },
    having: { id_orden_equipo: { _count: { gt: 1 } } }
  });
  
  console.log(`\nTotal: ${ordenesConMulti.length} órdenes`);
  
  for (const og of ordenesConMulti) {
    const ordenInfo = await prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: og.id_orden_servicio },
      select: { numero_orden: true }
    });
    console.log(`  - ${ordenInfo?.numero_orden} (ID: ${og.id_orden_servicio}) => ${og._count.id_orden_equipo} equipos`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
