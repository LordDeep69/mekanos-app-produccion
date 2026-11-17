import { Controller, Get } from '@nestjs/common';
import * as os from 'os';
import { Public } from '../auth/decorators/public.decorator';
import { GIT_COMMIT } from '../common/git-commit';
import { PrismaService } from '../database/prisma.service';

const SERVER_HOSTNAME = os.hostname();
const SERVER_ENVIRONMENT = process.env.NODE_ENV || 'development';

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
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      commit: GIT_COMMIT,
      timestamp: new Date().toISOString(),
      service: process.env.APP_NAME || 'EAM Platform API',
      app: process.env.APP_SLUG || 'eam-api',
      environment: SERVER_ENVIRONMENT,
      hostname: SERVER_HOSTNAME,
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
        service: process.env.APP_NAME || 'EAM Platform API',
        version: '0.1.0',
        tables: {
          usuarios: usuariosCount,
          equipos: equiposCount,
          ordenes_servicio: ordenesCount,
        },
        databaseEndpoint: this.resolveSafeDatabaseMetadata(),
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

  private resolveSafeDatabaseMetadata(): {
    host: string;
    port: number;
    pooler: string;
  } {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) {
      return { host: 'unconfigured', port: 5432, pooler: 'Direct Connection' };
    }
    try {
      const parsed = new URL(rawUrl);
      const port = parsed.port ? parseInt(parsed.port, 10) : 5432;
      const isPgBouncer =
        parsed.searchParams.get('pgbouncer') === 'true' || port === 6543;
      return {
        host: parsed.hostname || 'localhost',
        port,
        pooler: isPgBouncer ? 'PgBouncer Transaction Mode' : 'Direct PostgreSQL',
      };
    } catch {
      return { host: 'configured', port: 5432, pooler: 'PostgreSQL' };
    }
  }
}
