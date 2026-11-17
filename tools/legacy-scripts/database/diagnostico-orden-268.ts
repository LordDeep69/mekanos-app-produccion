/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.ordenes_servicio.findUnique({
    where: { id_orden_servicio: 268 },
    include: { estado: true },
  });
  
  console.log('='.repeat(50));
  console.log('DIAGNÓSTICO ORDEN 268');
  console.log('='.repeat(50));
  console.log('Número:', o?.numero_orden);
  console.log('Estado ID:', o?.id_estado_actual);
  console.log('Estado código:', o?.estado?.codigo_estado);
  console.log('Técnico ID:', o?.id_tecnico_asignado);
  
  // Verificar qué ordenes tiene el empleado 6
  console.log('\n' + '='.repeat(50));
  console.log('ÓRDENES DEL EMPLEADO 6');
  console.log('='.repeat(50));
  
  const ordenes = await prisma.ordenes_servicio.findMany({
    where: {
      id_tecnico_asignado: 6,
      estado: { codigo_estado: { in: ['ASIGNADA', 'EN_EJECUCION', 'INICIADA'] } }
    },
    include: { estado: true }
  });
  
  console.log('Total órdenes activas:', ordenes.length);
  for (const orden of ordenes) {
    console.log(`  - ${orden.numero_orden} (${orden.estado?.codigo_estado})`);
  }
  
  await prisma.$disconnect();
}
main().catch(console.error);
