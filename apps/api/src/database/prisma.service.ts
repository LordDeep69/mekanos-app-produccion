/**
 * PrismaService - Servicio inyectable de NestJS para Prisma Client
 * 
 * Extiende PrismaClient directamente para heredar todos los métodos
 * e implementa lifecycle hooks de NestJS para conexión y desconexión
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 2_000; // 2s entre intentos

  constructor() {
    super({
      log: [
        // { emit: 'stdout', level: 'query' }, // ⚠️ DISABLED para evitar encoding issues
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  /**
   * Conecta a la base de datos al inicializar el módulo con retry
   */
  async onModuleInit() {
    await this.connectWithRetry();
    this.logger.log('Conexión establecida con Supabase');
  }

  private async connectWithRetry(attempt: number = 1): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      if (attempt < PrismaService.MAX_RETRIES) {
        const delay = PrismaService.BASE_DELAY * attempt;
        this.logger.warn(
          `Intento ${attempt}/${PrismaService.MAX_RETRIES} falló. Reintentando en ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.connectWithRetry(attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Desconecta de la base de datos al destruir el módulo
   */
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
