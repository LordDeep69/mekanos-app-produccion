const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const o = await p.ordenes_servicio.findFirst({ where: { prioridad: { not: null } } });
  console.log('Prioridad:', o?.prioridad);
  console.log('Origen:', o?.origen_solicitud);
  
  await p.$disconnect();
}

main();
