import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedCore } from './seeds/seed-core';
import { seedCatalogPresets } from './seeds/seed-catalog-presets';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed modular White-Label...\n');
  await seedCore(prisma);

  const presetsEnv = process.env.SEED_PRESETS?.trim();
  if (presetsEnv) {
    await seedCatalogPresets(prisma, presetsEnv.split(','));
  }

  console.log('\n🎉 Seed modular completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
