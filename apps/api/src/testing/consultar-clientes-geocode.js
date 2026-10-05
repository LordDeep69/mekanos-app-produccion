/**
 * SOLO LECTURA — Diagnóstico previo a la geocodificación de clientes.
 *
 * Lista clientes con sus datos de ubicación (personas.url_ubicacion /
 * personas.direccion_principal / ciudad) para elegir un candidato de piloto
 * y medir cuántos registros requieren llenado.
 *
 * Uso: node src/testing/consultar-clientes-geocode.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

async function main() {
  const total = await prisma.clientes.count();
  console.log(`TOTAL CLIENTES: ${total}`);

  const clientes = await prisma.clientes.findMany({
    orderBy: { id_cliente: 'asc' },
    select: {
      id_cliente: true,
      codigo_cliente: true,
      cliente_activo: true,
      nombre_sede: true,
      persona: {
        select: {
          id_persona: true,
          razon_social: true,
          nombre_comercial: true,
          direccion_principal: true,
          url_ubicacion: true,
          ciudad: true,
          departamento: true,
          pais: true,
        },
      },
    },
  });

  const conUrl = clientes.filter((c) => c.persona?.url_ubicacion).length;
  const conDir = clientes.filter((c) => c.persona?.direccion_principal).length;
  const conNombre = clientes.filter(
    (c) => c.persona?.razon_social || c.persona?.nombre_comercial,
  ).length;
  const sinPersona = clientes.filter((c) => !c.persona).length;

  console.log(`  con url_ubicacion      : ${conUrl}`);
  console.log(`  con direccion_principal: ${conDir}`);
  console.log(`  con nombre/razon social: ${conNombre}`);
  console.log(`  SIN persona vinculada  : ${sinPersona}`);
  console.log('');
  console.log('ID | ACTIVO | NOMBRE | CIUDAD | URL | DIR');
  console.log('---|---|---|---|---|---');

  for (const c of clientes.slice(0, 60)) {
    const p = c.persona || {};
    const nombre = (p.razon_social || p.nombre_comercial || '(sin nombre)').slice(0, 45);
    console.log(
      [
        c.id_cliente,
        c.cliente_activo ? 'SI' : 'no',
        nombre,
        p.ciudad || '-',
        p.url_ubicacion ? 'SI' : 'no',
        p.direccion_principal ? 'SI' : 'no',
      ].join(' | '),
    );
  }
  if (clientes.length > 60) {
    console.log(`... y ${clientes.length - 60} mas`);
  }
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
