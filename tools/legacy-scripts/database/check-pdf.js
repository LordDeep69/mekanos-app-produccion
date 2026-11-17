const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  console.log('=== FIX FIRMAS DUPLICADAS ===\n');

  // La orden 614 tiene firma 61 (técnico) y 62 (cliente) - SON LAS CORRECTAS para 614
  // La orden 615 TAMBIÉN tiene 61 y 62 - INCORRECTO, necesita sus propias firmas

  // Verificar estado actual
  const orden615 = await prisma.$queryRaw`
    SELECT id_orden_servicio, numero_orden, id_firma_tecnico, id_firma_cliente
    FROM ordenes_servicio WHERE id_orden_servicio = 615
  `;
  console.log('Orden 615 antes:', JSON.stringify(orden615[0], null, 2));

  // Copiar firma 61 como nueva firma para orden 615
  const firma61 = await prisma.firmas_digitales.findUnique({ where: { id_firma_digital: 61 } });
  const firma62 = await prisma.firmas_digitales.findUnique({ where: { id_firma_digital: 62 } });

  if (!firma61 || !firma62) {
    console.log('ERROR: No se encontraron las firmas originales');
    return;
  }

  console.log('Firma 61 registrada_por:', firma61.registrada_por);

  // Crear copias de las firmas para orden 615 usando SQL directo
  // Hash SHA256 real para pasar el check constraint
  const hashTec = crypto.createHash('sha256').update(firma61.firma_base64 + '_615_tec_' + Date.now()).digest('hex');
  const hashCli = crypto.createHash('sha256').update(firma62.firma_base64 + '_615_cli_' + Date.now()).digest('hex');
  const registradaPor = firma61.registrada_por || 1;

  const nuevaFirmaTecnico = await prisma.$queryRaw`
      INSERT INTO firmas_digitales (id_persona, tipo_firma, firma_base64, formato_firma, hash_firma, fecha_captura, es_firma_principal, activa, observaciones, registrada_por, fecha_registro)
      VALUES (${firma61.id_persona}, 'TECNICO', ${firma61.firma_base64}, ${firma61.formato_firma}, ${hashTec}, NOW(), false, true, 'Firma TECNICO - OS-202601-0012', ${registradaPor}, NOW())
      RETURNING id_firma_digital
    `;
  const idFirmaTecnico = nuevaFirmaTecnico[0].id_firma_digital;
  console.log('Nueva firma técnico creada:', idFirmaTecnico);

  const nuevaFirmaCliente = await prisma.$queryRaw`
      INSERT INTO firmas_digitales (id_persona, tipo_firma, firma_base64, formato_firma, hash_firma, fecha_captura, es_firma_principal, activa, observaciones, registrada_por, fecha_registro)
      VALUES (${firma62.id_persona}, 'CLIENTE', ${firma62.firma_base64}, ${firma62.formato_firma}, ${hashCli}, NOW(), false, true, 'Firma CLIENTE - OS-202601-0012', ${registradaPor}, NOW())
      RETURNING id_firma_digital
    `;
  const idFirmaCliente = nuevaFirmaCliente[0].id_firma_digital;
  console.log('Nueva firma cliente creada:', idFirmaCliente);

  // Actualizar orden 615 con las nuevas firmas
  await prisma.$executeRaw`
    UPDATE ordenes_servicio 
    SET id_firma_tecnico = ${idFirmaTecnico},
        id_firma_cliente = ${idFirmaCliente}
    WHERE id_orden_servicio = 615
  `;

  console.log('\n✅ Orden 615 actualizada con nuevas firmas');

  // Verificar
  const orden615After = await prisma.$queryRaw`
    SELECT id_orden_servicio, numero_orden, id_firma_tecnico, id_firma_cliente
    FROM ordenes_servicio WHERE id_orden_servicio = 615
  `;
  console.log('Orden 615 después:', JSON.stringify(orden615After[0], null, 2));

  const orden614 = await prisma.$queryRaw`
    SELECT id_orden_servicio, numero_orden, id_firma_tecnico, id_firma_cliente
    FROM ordenes_servicio WHERE id_orden_servicio = 614
  `;
  console.log('Orden 614 (sin cambios):', JSON.stringify(orden614[0], null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
