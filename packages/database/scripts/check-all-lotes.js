const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lotes = await prisma.lotes_componentes.findMany({
    include: {
      catalogo_componentes: {
        select: {
          id_componente: true,
          codigo_interno: true,
          descripcion_corta: true,
        }
      },
      movimientos_inventario: {
        select: {
          id_movimiento: true,
          id_ubicacion: true,
          ubicaciones_bodega: { select: { codigo_ubicacion: true, zona: true } }
        }
      }
    }
  });

  console.log('Total lotes:', lotes.length);
  for (const l of lotes) {
    const movUbis = l.movimientos_inventario.map(m => `${m.id_ubicacion} (${m.ubicaciones_bodega?.codigo_ubicacion})`);
    console.log(`Lote ${l.id_lote} (${l.codigo_lote}): Art ${l.catalogo_componentes?.codigo_interno}, Cant ${l.cantidad_actual}, Movs ubicaciones: [${movUbis.join(', ')}]`);
  }
}

main().finally(() => prisma.$disconnect());
