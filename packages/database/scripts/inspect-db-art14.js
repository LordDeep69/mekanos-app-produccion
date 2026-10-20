const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const comp = await prisma.catalogo_componentes.findFirst({
    where: { codigo_interno: 'ART-2026-0014' },
    select: { id_componente: true, descripcion_corta: true, stock_actual: true }
  });
  console.log('Componente:', comp);

  const lotes = await prisma.lotes_componentes.findMany({
    where: { id_componente: comp.id_componente },
  });
  console.log('Lotes:', JSON.stringify(lotes, null, 2));

  const movs = await prisma.movimientos_inventario.findMany({
    where: { id_componente: comp.id_componente },
    orderBy: { fecha_movimiento: 'asc' },
    select: {
      id_movimiento: true,
      tipo_movimiento: true,
      origen_movimiento: true,
      cantidad: true,
      id_ubicacion: true,
      id_lote: true,
      observaciones: true,
      fecha_movimiento: true,
      ubicaciones_bodega: {
        select: {
          id_ubicacion: true,
          codigo_ubicacion: true,
          zona: true,
        }
      }
    }
  });
  console.log('Movimientos:', JSON.stringify(movs, null, 2));
}

main().finally(() => prisma.$disconnect());
