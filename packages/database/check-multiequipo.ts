import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 VERIFICACIÓN MULTI-EQUIPOS');
  console.log('='.repeat(60));
  
  // Buscar orden específica
  const numeroOrden = 'OS-ME-3BOM-334804';
  
  const orden = await prisma.ordenes_servicio.findFirst({
    where: { numero_orden: numeroOrden },
    include: {
      ordenes_equipos: {
        include: { 
          equipos: true 
        },
        orderBy: { orden_secuencia: 'asc' }
      },
      equipos: true // Equipo principal
    }
  });
  
  if (!orden) {
    console.log(`❌ Orden ${numeroOrden} NO ENCONTRADA`);
    return;
  }
  
  console.log(`\n✅ ORDEN: ${orden.numero_orden}`);
  console.log(`   ID Orden Servicio: ${orden.id_orden_servicio}`);
  console.log(`   ID Equipo Principal: ${orden.id_equipo}`);
  console.log(`   Equipo Principal: ${orden.equipos?.nombre_equipo || 'N/A'}`);
  
  console.log(`\n📦 EQUIPOS EN ordenes_equipos: ${orden.ordenes_equipos?.length || 0}`);
  
  if (orden.ordenes_equipos && orden.ordenes_equipos.length > 0) {
    orden.ordenes_equipos.forEach((oe, i) => {
      console.log(`   [${i + 1}] idOrdenEquipo: ${oe.id_orden_equipo}`);
      console.log(`       idEquipo: ${oe.id_equipo}`);
      console.log(`       nombreSistema: ${oe.nombre_sistema || 'N/A'}`);
      console.log(`       codigoEquipo: ${oe.equipos?.codigo_equipo || 'N/A'}`);
      console.log(`       nombreEquipo: ${oe.equipos?.nombre_equipo || 'N/A'}`);
      console.log(`       ordenSecuencia: ${oe.orden_secuencia}`);
      console.log(`       estado: ${oe.estado || 'N/A'}`);
      console.log('');
    });
  } else {
    console.log('   ⚠️ Esta orden NO tiene registros en ordenes_equipos');
    console.log('   📌 Esto significa que es una orden simple (1 equipo) o no se han migrado los datos');
  }
  
  // Verificar todas las órdenes multi-equipo
  console.log('\n' + '='.repeat(60));
  console.log('📊 TODAS LAS ÓRDENES CON MÚLTIPLES EQUIPOS:');
  console.log('='.repeat(60));
  
  const ordenesConMultiEquipos = await prisma.ordenes_equipos.groupBy({
    by: ['id_orden_servicio'],
    _count: { id_orden_equipo: true },
    having: {
      id_orden_equipo: { _count: { gt: 1 } }
    }
  });
  
  console.log(`\nÓrdenes con 2+ equipos: ${ordenesConMultiEquipos.length}`);
  
  for (const og of ordenesConMultiEquipos) {
    const ordenInfo = await prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: og.id_orden_servicio },
      select: { numero_orden: true }
    });
    console.log(`   - ${ordenInfo?.numero_orden} (ID: ${og.id_orden_servicio}) => ${og._count.id_orden_equipo} equipos`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
