const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 CHECKING TIPOS_EQUIPO...');
  const tipos = await prisma.tipos_equipo.findMany();
  console.log('TOTAL TIPOS:', tipos.length);
  tipos.forEach(t => {
    console.log(`- ID: ${t.id_tipo_equipo} | Codigo: ${t.codigo_tipo} | Nombre: ${t.nombre_tipo} | Activo: ${t.activo}`);
  });
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
