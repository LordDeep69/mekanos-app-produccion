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
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Configuración de logs de Prisma.
 *
 * El log de queries (`prisma:query`) imprime el SQL completo de CADA consulta en
 * stdout. En Windows (consola/PowerShell) eso agrega decenas de milisegundos por
 * consulta y hace ilegible la salida. Queda disponible sólo si se activa
 * explícitamente con PRISMA_LOG_QUERIES=true.
 */
const PRISMA_LOG: Prisma.LogDefinition[] = [
  ...(process.env.PRISMA_LOG_QUERIES === 'true'
    ? ([{ emit: 'stdout', level: 'query' }] as Prisma.LogDefinition[])
    : []),
  { emit: 'stdout', level: 'error' },
  { emit: 'stdout', level: 'warn' },
];

/**
 * PrismaService - Servicio inyectable de NestJS para Prisma Client
 * 
 * Extiende PrismaClient directamente para heredar todos los métodos
 * e implementa lifecycle hooks de NestJS para conexión y desconexión
 */
/**
 * Instancia única compartida por todo el proceso.
 *
 * IMPORTANTE: cada `new PrismaClient()` mantiene su PROPIO pool de conexiones.
 * Si NestJS instancia PrismaService más de una vez (por ejemplo cuando un
 * módulo lo declara en su array `providers`, o cuando existen dos clases
 * PrismaService distintas), se abren varios pools contra Supabase y se agota
 * el límite del pooler en modo sesión:
 *   FATAL: (EMAXCONNSESSION) max clients reached in session mode
 *     - max clients are limited to pool_size: 15
 *
 * Con este singleton, todas las inyecciones del proceso (globales o por módulo)
 * reutilizan la MISMA conexión/pool. El coste es que el constructor puede
 * instanciar un cliente "descartado" (nunca se usa ni abre conexiones, porque
 * Prisma conecta de forma perezosa).
 */
let sharedInstance: PrismaService | undefined;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ log: PRISMA_LOG });

    if (sharedInstance) {
      return sharedInstance;
    }
    sharedInstance = this;
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
export const prisma = new PrismaClient({ log: PRISMA_LOG });

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
