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
 *
 * IMPORTANTE: es LAZY a propósito.
 *
 * Antes se hacía `export const prisma = new PrismaClient(...)` a nivel de módulo,
 * lo que tenía dos efectos indeseados al importar `@mekanos/database`:
 *
 *  1. Creaba un segundo pool de conexiones paralelo al de PrismaService.
 *  2. El constructor de PrismaClient carga automáticamente el `.env` que está
 *     junto al schema (`packages/database/.env`, puerto 6543 + pgbouncer) y lo
 *     escribe en `process.env` ANTES de que NestJS ejecute `ConfigModule.forRoot`
 *     (que apunta a `apps/api/.env`, puerto 5432). Como dotenv NO sobreescribe
 *     variables ya definidas, la API terminaba conectándose al puerto equivocado
 *     y con `connection_limit` por defecto.
 *
 * Con el Proxy, el cliente legacy sólo se crea la primera vez que se usa de
 * verdad (scripts, seeds, pruebas). La API nunca lo toca: usa PrismaService.
 */
let legacyClient: PrismaClient | undefined;

function getLegacyClient(): PrismaClient {
  if (!legacyClient) {
    legacyClient = new PrismaClient({ log: PRISMA_LOG });
  }
  return legacyClient;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getLegacyClient() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

/**
 * Graceful shutdown handler para instancia legacy
 */
process.on('beforeExit', async () => {
  if (legacyClient) {
    await legacyClient.$disconnect();
  }
});

/**
 * Export por defecto para compatibilidad
 */
export default prisma;
