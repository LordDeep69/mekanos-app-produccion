import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEstados() {
  try {
    const estados = await prisma.estados_orden.findMany();
    console.log('Estados de orden:');
    estados.forEach(e => console.log(`${e.id_estado}: ${e.nombre_estado} (${e.codigo_estado})`));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEstados();