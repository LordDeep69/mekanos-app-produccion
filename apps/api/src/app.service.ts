import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { GIT_COMMIT } from './common/git-commit';
import { PrismaService } from './database/prisma.service';

const SERVER_HOSTNAME = os.hostname();

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Mekanos API - Equipment Management System v0.1.0';
  }

  /**
   * Health check endpoint
   * Verifica conexión a la base de datos
   */
  async getHealth(): Promise<{
    status: string;
    service: string;
    app: string;
    hostname: string;
    version: string;
    commit?: string;
    timestamp: string;
    database: string;
    environment: string;
  }> {
    try {
      // Test de conexión real a la base de datos
      await this.prisma.$queryRaw`SELECT 1 as health_check`;

      return {
        status: 'ok',
        service: 'Mekanos API',
        app: 'mekanos-api',
        hostname: SERVER_HOSTNAME,
        version: '0.1.0',
        commit: GIT_COMMIT,
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      return {
        status: 'error',
        service: 'Mekanos API',
        app: 'mekanos-api',
        hostname: SERVER_HOSTNAME,
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        environment: process.env.NODE_ENV || 'development',
      };
    }
  }
}
