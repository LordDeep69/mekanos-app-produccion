import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from apps/api/.env or .env
dotenv.config({ path: path.resolve(__dirname, '../../../apps/api/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('--- TIPOS DE SERVICIO ---');
  const tipos = await prisma.tipos_servicio.findMany({
    orderBy: { id_tipo_servicio: 'asc' },
    include: { tipos_equipo: true },
  });
  tipos.forEach((t) => {
    console.log(
      `ID ${t.id_tipo_servicio}: [${t.codigo_tipo}] ${t.nombre_tipo} | Cat: ${t.categoria} | Equipo: ${t.tipos_equipo?.nombre_tipo || 'GENERAL'} | Checklist: ${t.tiene_checklist}`
    );
  });

  console.log('\n--- CATALOGO DE SERVICIOS (Por categoría) ---');
  const catalogo = await prisma.catalogo_servicios.findMany({
    orderBy: [{ categoria: 'asc' }, { id_servicio: 'asc' }],
    include: {
      tipos_servicio: true,
      tipos_equipo: true,
    },
  });
  console.log(`Total servicios en catalogo: ${catalogo.length}`);
  catalogo.forEach((c) => {
    console.log(
      `ID ${c.id_servicio}: [${c.codigo_servicio}] ${c.nombre_servicio} | Cat: ${c.categoria} | TipoServ: ${c.tipos_servicio?.nombre_tipo || 'N/A'} | TipoEq: ${c.tipos_equipo?.nombre_tipo || 'GENERAL'} | Precio: ${c.precio_base || 0}`
    );
  });
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
