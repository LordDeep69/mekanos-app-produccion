const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const movsSinLoteOUbi = await prisma.movimientos_inventario.findMany({
    where: {
      OR: [
        { id_ubicacion: null },
        { id_lote: null }
      ]
    },
    include: {
      catalogo_componentes: {
        select: {
          id_componente: true,
          codigo_interno: true,
          descripcion_corta: true,
        }
      }
    }
  });

  console.log('Movimientos sin lote o ubicacion:', movsSinLoteOUbi.length);
  for (const m of movsSinLoteOUbi) {
    console.log(`ID: ${m.id_movimiento}, Art: ${m.catalogo_componentes?.codigo_interno} (${m.catalogo_componentes?.descripcion_corta}), Tipo: ${m.tipo_movimiento}, Origen: ${m.origen_movimiento}, Cant: ${m.cantidad}, Ubi: ${m.id_ubicacion}, Lote: ${m.id_lote}`);
  }
}

main().finally(() => prisma.$disconnect());
