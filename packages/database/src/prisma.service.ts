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
   * Conecta a la base de datos al inicializar el módulo
   */
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connection established');
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
