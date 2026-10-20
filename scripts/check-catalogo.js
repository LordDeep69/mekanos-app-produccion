const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.$queryRawUnsafe(`
    SELECT id_componente, codigo_interno, referencia_fabricante, descripcion_corta, stock_actual, stock_minimo, precio_compra, es_inventariable, activo
    FROM catalogo_componentes
    ORDER BY id_componente ASC;
  `);
  console.log(`Total items in catalogo: ${items.length}`);
  console.log('Items:', items);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
