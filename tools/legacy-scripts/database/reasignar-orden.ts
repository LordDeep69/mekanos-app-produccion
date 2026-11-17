import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Reasignando orden OS-CORR-PLAN-679281 a empleado 6...\n');

  try {
    // Actualizar la orden
    const result = await prisma.ordenes_servicio.update({
      where: { numero_orden: 'OS-CORR-PLAN-679281' },
      data: { id_tecnico_asignado: 6 }
    });

    console.log('✅ Orden reasignada exitosamente:');
    console.log(`   Número: ${result.numero_orden}`);
    console.log(`   Nuevo técnico asignado: ID 6`);

    // Verificar
    const verificacion = await prisma.$queryRawUnsafe<any[]>(`
      SELECT os.numero_orden, os.id_tecnico_asignado, emp.nombre_completo
      FROM ordenes_servicio os
      LEFT JOIN empleados emp ON emp.id_empleado = os.id_tecnico_asignado
      WHERE os.numero_orden = 'OS-CORR-PLAN-679281'
    `);

    if (verificacion.length > 0) {
      console.log(`\n📋 Verificación:`);
      console.log(`   Técnico: ${verificacion[0].nombre_completo || 'ID ' + verificacion[0].id_tecnico_asignado}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
