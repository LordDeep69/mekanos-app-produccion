const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name='documentos_generados'
    ORDER BY ordinal_position
  `);
  console.log('Columnas documentos_generados:');
  columns.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));
}

main().then(() => process.exit(0));
