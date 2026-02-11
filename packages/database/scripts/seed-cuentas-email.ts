/**
 * Script para poblar la tabla cuentas_email con las cuentas de Gmail configuradas
 * Ejecutar con: npx ts-node scripts/seed-cuentas-email.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const cuentasEmail = [
  {
    nombre: 'Cuenta Principal Mekanos',
    email: 'mekanossas4@gmail.com',
    gmail_client_id: process.env.GMAIL_CLIENT_ID_1 || 'YOUR_CLIENT_ID_HERE',
    gmail_client_secret: process.env.GMAIL_CLIENT_SECRET_1 || 'YOUR_CLIENT_SECRET_HERE',
    gmail_refresh_token: process.env.GMAIL_REFRESH_TOKEN_1 || 'YOUR_REFRESH_TOKEN_HERE',
    es_cuenta_principal: true,
    activa: true,
  },
  {
    nombre: 'Ventas Mekanos',
    email: 'mekanossas2@gmail.com',
    gmail_client_id: process.env.GMAIL_CLIENT_ID_2 || 'YOUR_CLIENT_ID_HERE',
    gmail_client_secret: process.env.GMAIL_CLIENT_SECRET_2 || 'YOUR_CLIENT_SECRET_HERE',
    gmail_refresh_token: process.env.GMAIL_REFRESH_TOKEN_2 || 'YOUR_REFRESH_TOKEN_HERE',
    es_cuenta_principal: false,
    activa: true,
  },
  {
    nombre: 'Auxiliar Contable Mekanos',
    email: 'auxiliarcontablemekano@gmail.com',
    gmail_client_id: process.env.GMAIL_CLIENT_ID_3 || 'YOUR_CLIENT_ID_HERE',
    gmail_client_secret: process.env.GMAIL_CLIENT_SECRET_3 || 'YOUR_CLIENT_SECRET_HERE',
    gmail_refresh_token: process.env.GMAIL_REFRESH_TOKEN_3 || 'YOUR_REFRESH_TOKEN_HERE',
    es_cuenta_principal: false,
    activa: true,
  },
];

async function main() {
  console.log('🚀 Iniciando seed de cuentas de email...\n');

  for (const cuenta of cuentasEmail) {
    // Verificar si ya existe
    const existente = await prisma.cuentas_email.findFirst({
      where: { email: cuenta.email },
    });

    if (existente) {
      console.log(`⏭️  Cuenta ${cuenta.email} ya existe, actualizando...`);
      await prisma.cuentas_email.update({
        where: { id_cuenta_email: existente.id_cuenta_email },
        data: cuenta,
      });
      console.log(`   ✅ Actualizada: ${cuenta.nombre}`);
    } else {
      console.log(`➕ Creando cuenta: ${cuenta.email}`);
      await prisma.cuentas_email.create({
        data: cuenta,
      });
      console.log(`   ✅ Creada: ${cuenta.nombre}`);
    }
  }

  console.log('\n✅ Seed completado!');

  // Mostrar resumen
  const total = await prisma.cuentas_email.count();
  const activas = await prisma.cuentas_email.count({ where: { activa: true } });
  console.log(`\n📊 Resumen:`);
  console.log(`   Total cuentas: ${total}`);
  console.log(`   Cuentas activas: ${activas}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
