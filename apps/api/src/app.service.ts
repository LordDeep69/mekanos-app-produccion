import { Injectable } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';

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
    timestamp: string;
    database: string;
    environment: string;
  }> {
    try {
      // Test de conexión real a la base de datos
      await this.prisma.$queryRaw`SELECT 1 as health_check`;

      let gitCommit = 'unknown';
      try {
        const { execSync } = require('child_process');
        gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      } catch (e) {}

      return {
        status: 'ok',
        commit: gitCommit,
        timestamp: new Date().toISOString(),
        database: 'connected',
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        environment: process.env.NODE_ENV || 'development',
      };
    }
  }
}
