const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Sanitizing movimientos_inventario...');

  // 1. ART-2026-0014 (Aceite Hidráulico Shell Tellus): Movimiento 54
  const m54 = await prisma.movimientos_inventario.update({
    where: { id_movimiento: 54 },
    data: {
      id_ubicacion: 2, // BOD-FLUIDOS
      id_lote: 5,      // LOT-2026-0005
    }
  });
  console.log('Updated Movimiento 54:', m54);

  // 2. ART-2026-0007 (Filtro de Aire MANN): Movimiento 51 & 53
  const m51 = await prisma.movimientos_inventario.update({
    where: { id_movimiento: 51 },
    data: {
      id_ubicacion: 1, // BOD-CENTRAL
      id_lote: 3,      // LOT-2026-0003
    }
  });
  console.log('Updated Movimiento 51:', m51);

  const m53 = await prisma.movimientos_inventario.update({
    where: { id_movimiento: 53 },
    data: {
      id_ubicacion: 1, // BOD-CENTRAL
      id_lote: 3,      // LOT-2026-0003
    }
  });
  console.log('Updated Movimiento 53:', m53);

  // 3. ART-2026-0013 (Aceite CAT DEO): Movimiento 48
  const m48 = await prisma.movimientos_inventario.update({
    where: { id_movimiento: 48 },
    data: {
      id_ubicacion: 2, // BOD-FLUIDOS
      id_lote: 4,      // LOT-2026-0004
    }
  });
  console.log('Updated Movimiento 48:', m48);

  console.log('Sanitization complete!');
}

main().finally(() => prisma.$disconnect());
