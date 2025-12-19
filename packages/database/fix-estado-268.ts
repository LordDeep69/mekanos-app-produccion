/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar el ID del estado ASIGNADA
  const estadoAsignada = await prisma.estados_orden.findFirst({
    where: { codigo_estado: 'ASIGNADA' },
  });
  console.log('Estado ASIGNADA ID:', estadoAsignada?.id_estado);

  // Actualizar la orden 268
  const updated = await prisma.ordenes_servicio.update({
    where: { id_orden_servicio: 268 },
    data: { id_estado_actual: estadoAsignada?.id_estado },
  });
  console.log('✅ Orden 268 actualizada a ASIGNADA');
  console.log('   Número:', updated.numero_orden);
  console.log('   Nuevo estado ID:', updated.id_estado_actual);

  await prisma.$disconnect();
}
main().catch(console.error);
