/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const o = await prisma.ordenes_servicio.findUnique({
    where: { id_orden_servicio: 268 },
    include: { tecnico: true },
  });
  console.log('Orden:', o?.numero_orden);
  console.log('Tecnico ID:', o?.id_tecnico_asignado);
  console.log('Tecnico:', o?.tecnico?.nombre_empleado);
  await prisma.$disconnect();
}
main().catch(console.error);
