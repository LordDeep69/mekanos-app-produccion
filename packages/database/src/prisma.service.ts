/**
 * Mekanos S.A.S - Prisma Database Service
 *
 * Servicio centralizado para gestionar la conexión a PostgreSQL
 * usando Prisma Client con integración NestJS.
 *
 * Features:
 * - Logging de queries para debugging
 * - Error logging
 * - Warning logging
 * - Singleton pattern (NestJS Injectable)
 * - Graceful shutdown con OnModuleDestroy
 *
 * @module PrismaService
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Servicio inyectable de NestJS para Prisma Client
 * 
 * Extiende PrismaClient directamente para heredar todos los métodos
 * e implementa lifecycle hooks de NestJS para conexión y desconexión
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  /**
   * Conecta a la base de datos al inicializar el módulo.
   * Reintenta con backoff exponencial si hay problemas de conexión
   * (ej. internet inestable, pooler temporalmente caído).
   */
  async onModuleInit() {
    const maxRetries = 5;
    const initialDelayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        console.log('✅ Database connection established');
        return;
      } catch (error) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        console.error(
          `❌ Database connection attempt ${attempt}/${maxRetries} failed. ` +
          `Retrying in ${delayMs / 1000}s...`,
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error(`❌ All ${maxRetries} connection attempts failed`);
          throw error;
        }
      }
    }
  }

  /**
   * Desconecta de la base de datos al destruir el módulo
   */
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('👋 Database connection closed');
  }
}

/**
 * Instancia singleton legacy para compatibilidad con código existente
 * @deprecated Use PrismaService con NestJS dependency injection
 */
export const prisma = new PrismaClient({
  log: [
    { emit: 'stdout', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
  ],
});

/**
 * Graceful shutdown handler para instancia legacy
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Export por defecto para compatibilidad
 */
export default prisma;
