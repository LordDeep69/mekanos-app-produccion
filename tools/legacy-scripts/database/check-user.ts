import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const usuario = await prisma.usuarios.findUnique({
    where: { email: 'admin@mekanos.com' },
    include: { persona: true },
  });

  console.log(JSON.stringify(usuario, null, 2));
}

checkUser().finally(() => prisma.$disconnect());
