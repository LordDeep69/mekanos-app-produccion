import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

/**
 * HealthController - Controlador de Health Check
 * 
 * Endpoints para monitoreo del estado de la aplicación.
 * 
 * @controller health
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Health Check Básico
   * 
   * Valida que el servidor esté respondiendo.
   * 
   * @returns {Object} Status de la aplicación
   * 
   * @example
   * GET /api/health
   * Response: { status: 'ok', timestamp: '2025-11-13T...' }
   */
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Mekanos API',
      version: '0.1.0',
    };
  }

  /**
   * Health Check Detallado con Base de Datos
   * 
   * Valida que el servidor esté respondiendo Y que la base de datos
   * esté conectada correctamente.
   * 
   * @returns {Object} Status detallado incluyendo DB
   * 
   * @example
   * GET /api/health/detailed
   * Response: {
   *   status: 'healthy',
   *   database: 'connected',
   *   timestamp: '2025-11-13T...',
   *   tables: { usuarios: 0, equipos: 0, ordenes_servicio: 0 }
   * }
   */
  @Get('detailed')
  async checkDetailed() {
    try {
      // Test de conectividad + count de tablas principales
      const [, usuariosCount, equiposCount, ordenesCount] = await Promise.all([
        this.prisma.$queryRaw`SELECT 1 as health_check`,
        this.prisma.usuarios.count(),
        this.prisma.equipos.count(),
        this.prisma.ordenes_servicio.count(),
      ]);

      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        service: 'Mekanos API',
        version: '0.1.0',
        tables: {
          usuarios: usuariosCount,
          equipos: equiposCount,
          ordenes_servicio: ordenesCount,
        },
        supabase: {
          host: 'aws-1-sa-east-1.pooler.supabase.com',
          port: 6543,
          pooler: 'PgBouncer Transaction Mode',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
