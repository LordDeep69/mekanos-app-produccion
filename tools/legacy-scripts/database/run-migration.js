const { PrismaClient } = require('@prisma/client');

// Usar DATABASE_URL directamente del .env (Prisma lo lee automáticamente)
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Ejecutando migración: agregar id_firma_tecnico...');

    try {
        // Verificar si la columna ya existe
        const checkColumn = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'ordenes_servicio' AND column_name = 'id_firma_tecnico'
    `;

        if (checkColumn.length > 0) {
            console.log('✅ Columna id_firma_tecnico ya existe');
            return;
        }

        // Agregar columna
        await prisma.$executeRaw`ALTER TABLE ordenes_servicio ADD COLUMN id_firma_tecnico INT`;
        console.log('✅ Columna id_firma_tecnico agregada');

        // Agregar FK
        await prisma.$executeRaw`
      ALTER TABLE ordenes_servicio
      ADD CONSTRAINT fk_orden_firma_tecnico 
      FOREIGN KEY (id_firma_tecnico) 
      REFERENCES firmas_digitales(id_firma_digital) 
      ON DELETE SET NULL
    `;
        console.log('✅ FK fk_orden_firma_tecnico creada');

        // Crear índice
        await prisma.$executeRaw`CREATE INDEX idx_ordenes_firma_tecnico ON ordenes_servicio(id_firma_tecnico)`;
        console.log('✅ Índice idx_ordenes_firma_tecnico creado');

        console.log('🎉 Migración completada exitosamente');
    } catch (error) {
        if (error.message?.includes('already exists')) {
            console.log('⚠️ El objeto ya existe, continuando...');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

main()
    .then(() => prisma.$disconnect())
    .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
