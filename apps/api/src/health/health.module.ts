import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../database/prisma.module';

/**
 * HealthModule - Módulo de Health Check
 * 
 * Propósito:
 * - Validar conectividad de la API
 * - Validar conexión a base de datos
 * - Endpoint para monitoreo
 * 
 * Endpoints:
 * - GET /api/health - Health check básico
 * - GET /api/health/detailed - Health check con detalles de DB
 * 
 * @module HealthModule
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
