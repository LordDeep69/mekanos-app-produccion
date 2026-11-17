const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Asignar órdenes 282, 283, 284 al empleado 6
    const result = await prisma.ordenes_servicio.updateMany({
      where: { 
        id_orden_servicio: { in: [282, 283, 284] } 
      },
      data: { 
        id_tecnico_asignado: 6 
      }
    });
    
    console.log('✅ Ordenes actualizadas:', result.count);
    
    // Verificar asignación
    const ordenes = await prisma.ordenes_servicio.findMany({
      where: { id_orden_servicio: { in: [282, 283, 284] } },
      select: { id_orden_servicio: true, numero_orden: true, id_tecnico_asignado: true }
    });
    
    console.log('\n📋 Verificación:');
    ordenes.forEach(o => {
      console.log(`  - Orden ${o.id_orden_servicio} (${o.numero_orden}): Empleado ${o.id_tecnico_asignado}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
