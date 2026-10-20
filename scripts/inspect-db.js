const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const movCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'movimientos_inventario'
    ORDER BY ordinal_position;
  `);
  console.log('movimientos_inventario columns:', movCols);

  const lotesCount = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM lotes_componentes');
  console.log('Lotes count in DB:', lotesCount);

  const lotesList = await prisma.$queryRawUnsafe('SELECT * FROM lotes_componentes LIMIT 5');
  console.log('Lotes list sample:', lotesList);

  const bodegas = await prisma.$queryRawUnsafe('SELECT * FROM ubicaciones_bodega');
  console.log('Ubicaciones bodega:', bodegas);

  const motivos = await prisma.$queryRawUnsafe('SELECT * FROM motivos_ajuste');
  console.log('Motivos count:', motivos.length, motivos);

  const movsSample = await prisma.$queryRawUnsafe('SELECT * FROM movimientos_inventario LIMIT 5');
  console.log('Movimientos sample:', movsSample);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
