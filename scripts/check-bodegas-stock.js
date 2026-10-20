require('dotenv').config({ path: './apps/api/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Sanear BOD-CENTRAL
  await prisma.$queryRawUnsafe(`
    UPDATE ubicaciones_bodega
    SET zona = 'Bodega Central Taller'
    WHERE codigo_ubicacion = 'BOD-CENTRAL';
  `);
  console.log('✅ BOD-CENTRAL saneado a: Bodega Central Taller');

  const bodegas = await prisma.$queryRawUnsafe('SELECT * FROM ubicaciones_bodega');
  console.log('Ubicaciones bodega saneadas:', JSON.stringify(bodegas, null, 2));

  // 2. Columnas de lotes_componentes
  const loteCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lotes_componentes'
  `);
  console.log('lotes_componentes columns:', loteCols);

  // 3. Stock por bodega en lotes
  const stockPorBodega = await prisma.$queryRawUnsafe(`
    SELECT l.id_componente, c.referencia_fabricante, l.id_ubicacion, b.codigo_ubicacion, b.zona, SUM(l.cantidad_actual)::float as stock_lotes
    FROM lotes_componentes l
    JOIN catalogo_componentes c ON c.id_componente = l.id_componente
    LEFT JOIN ubicaciones_bodega b ON b.id_ubicacion = l.id_ubicacion
    WHERE l.cantidad_actual > 0
    GROUP BY l.id_componente, c.referencia_fabricante, l.id_ubicacion, b.codigo_ubicacion, b.zona
    ORDER BY l.id_componente;
  `);
  console.log('Stock por bodega en lotes:', JSON.stringify(stockPorBodega, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
