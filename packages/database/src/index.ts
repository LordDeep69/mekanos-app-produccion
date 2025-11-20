/**
 * @mekanos/database
 * 
 * Prisma ORM layer for Mekanos application
 * Exports PrismaService for NestJS integration
 */

export { PrismaClient } from '@prisma/client';
export { DatabaseModule } from './database.module';
export { PrismaService } from './prisma.service';

// Export Prisma enums
export {
    origen_movimiento_inventario_enum, tipo_movimiento_inventario_enum
} from '@prisma/client';

