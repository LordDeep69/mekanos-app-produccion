/**
 * Mekanos S.A.S - Prisma Database Service
 *
 * Servicio centralizado para gestionar la conexión a PostgreSQL
 * usando Prisma Client.
 *
 * Features:
 * - Logging de queries para debugging
 * - Error logging
 * - Warning logging
 * - Singleton pattern para reutilización
 *
 * @module PrismaService
 */

import { PrismaClient } from '@prisma/client';

/**
 * Instancia singleton de Prisma Client
 * Configurada con logging completo para desarrollo
 */
export const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

/**
 * Graceful shutdown handler
 * Cierra la conexión a la base de datos cuando el proceso termina
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Export por defecto para compatibilidad
 */
export default prisma;
