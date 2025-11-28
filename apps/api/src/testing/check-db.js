const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const tipos = await p.tipos_servicio.findMany();
  console.log('Tipos de servicio:', tipos.length);
  tipos.forEach(t => console.log(`  - ${t.id_tipo_servicio}: ${t.nombre_tipo}`));
  
  const estados = await p.estados_orden.findMany();
  console.log('\nEstados de orden:', estados.length);
  estados.forEach(e => console.log(`  - ${e.id_estado}: ${e.nombre_estado}`));
  
  await p.$disconnect();
}

check().catch(console.error);
