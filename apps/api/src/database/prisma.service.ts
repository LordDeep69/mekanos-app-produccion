/**
 * PrismaService - Servicio inyectable de NestJS para Prisma Client
 * 
 * Extiende PrismaClient directamente para heredar todos los métodos
 * e implementa lifecycle hooks de NestJS para conexión y desconexión
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
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
