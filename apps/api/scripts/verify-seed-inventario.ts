import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const comp = await prisma.catalogo_componentes.findFirst({ where: { codigo_interno: 'CMP-TEST-001' } });
  console.log('Componente:', comp);
  const lote = await prisma.lotes_componentes.findFirst({ where: { codigo_lote: 'LOT-TEST-001' } });
  console.log('Lote:', lote);
  const movimientos = await prisma.movimientos_inventario.findMany({ where: { id_lote: lote?.id_lote }, orderBy: { fecha_movimiento: 'asc' } });
  console.log('Movimientos:', movimientos);
  const stock = await prisma.movimientos_inventario.groupBy({ by: ['id_componente'], where: { id_componente: comp?.id_componente }, _sum: { cantidad: true } });
  console.log('Stock sum for component:', stock);
}

main().then(async () => { await prisma.$disconnect(); process.exit(0);}).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
