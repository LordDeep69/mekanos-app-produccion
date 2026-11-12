/**
 * Controller para gestión de configuración de parámetros por equipo
 *
 * Endpoints:
 * - GET /equipos/:id/config-parametros - Obtener config resuelta
 * - PUT /equipos/:id/config-parametros - Guardar config personalizada
 * - DELETE /equipos/:id/config-parametros - Limpiar config (usar global)
 *
 * @version 1.0 - 06-ENE-2026
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigParametrosService } from './config-parametros.service';
import { ConfigParametrosEquipo, ParametroOverrideEquipo } from './types/config-parametros.types';

/**
 * DTO para actualizar configuración de parámetros
 */
class UpdateConfigParametrosDto {
  unidades?: {
    temperatura?: string;
    presion?: string;
    voltaje?: string;
    frecuencia?: string;
    corriente?: string;
    velocidad?: string;
    vibracion?: string;
    potencia?: string;
  };
  rangos?: Record<
    string,
    {
      min_normal?: number;
      max_normal?: number;
      min_critico?: number;
      max_critico?: number;
      valor_ideal?: number;
    }
  >;
  por_parametro?: Record<string, ParametroOverrideEquipo>;
  parametros_adicionales?: ParametroOverrideEquipo[];
  parametros_nominales?: Record<string, number>;
  planes_preventivos?: unknown;
}

@ApiTags('Config Parámetros')
@Controller('equipos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConfigParametrosController {
  private readonly logger = new Logger(ConfigParametrosController.name);

  constructor(private readonly configService: ConfigParametrosService) {}

  /**
   * GET /equipos/:id/config-parametros
   * Obtener configuración resuelta (cascada: equipo → plantilla → global)
   */
  @Get(':id/config-parametros')
  @ApiOperation({
    summary: 'Obtener configuración de parámetros resuelta',
    description:
      'Retorna la configuración efectiva aplicando cascada: equipo → plantilla → catálogo global',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del equipo' })
  @ApiResponse({ status: 200, description: 'Configuración resuelta' })
  @ApiResponse({ status: 404, description: 'Equipo no encontrado' })
  async getConfigParametros(@Param('id', ParseIntPipe) idEquipo: number) {
    this.logger.log(`[GET] Config parámetros para equipo ${idEquipo}`);

    const config = await this.configService.resolverConfiguracion(idEquipo);

    return {
      success: true,
      data: config,
    };
  }

  /**
   * PUT /equipos/:id/config-parametros
   * Guardar configuración personalizada para el equipo
   */
  @Put(':id/config-parametros')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Guardar configuración personalizada',
    description: 'Guarda unidades y/o rangos personalizados para el equipo',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del equipo' })
  @ApiResponse({ status: 200, description: 'Configuración guardada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async updateConfigParametros(
    @Param('id', ParseIntPipe) idEquipo: number,
    @Body() dto: UpdateConfigParametrosDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user?.id || req.user?.sub || 1;
    this.logger.log(
      `[PUT] Actualizar config parámetros equipo ${idEquipo} por usuario ${usuarioId}`,
    );

    const config: ConfigParametrosEquipo = {
      unidades: dto.unidades,
      rangos: dto.rangos,
      por_parametro: dto.por_parametro,
      parametros_adicionales: dto.parametros_adicionales,
      parametros_nominales: dto.parametros_nominales,
      ...(dto.planes_preventivos !== undefined
        ? { planes_preventivos: dto.planes_preventivos }
        : {}),
    };

    await this.configService.guardarConfiguracion(idEquipo, config, usuarioId);

    // Retornar la config resuelta actualizada
    const configResuelta = await this.configService.resolverConfiguracion(idEquipo);

    return {
      success: true,
      message: 'Configuración actualizada correctamente',
      data: configResuelta,
    };
  }

  /**
   * DELETE /equipos/:id/config-parametros
   * Limpiar configuración personalizada (volver a usar catálogo global)
   */
  @Delete(':id/config-parametros')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar configuración personalizada',
    description:
      'Elimina la configuración personalizada del equipo, volviendo a usar el catálogo global',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del equipo' })
  @ApiResponse({ status: 200, description: 'Configuración limpiada' })
  async deleteConfigParametros(@Param('id', ParseIntPipe) idEquipo: number, @Req() req: any) {
    const usuarioId = req.user?.id || req.user?.sub || 1;
    this.logger.log(
      `[DELETE] Limpiar config parámetros equipo ${idEquipo} por usuario ${usuarioId}`,
    );

    // Guardar config vacía = usar global
    await this.configService.guardarConfiguracion(idEquipo, {}, usuarioId);

    return {
      success: true,
      message: 'Configuración personalizada eliminada. Se usará el catálogo global.',
    };
  }

  /**
   * GET /equipos/:id/unidades
   * Obtener solo las unidades resueltas (útil para UI)
   */
  @Get(':id/unidades')
  @ApiOperation({
    summary: 'Obtener unidades de medida del equipo',
    description: 'Retorna las unidades de medida efectivas para cada tipo de magnitud',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID del equipo' })
  @ApiResponse({ status: 200, description: 'Unidades resueltas' })
  async getUnidades(@Param('id', ParseIntPipe) idEquipo: number) {
    const unidades = await this.configService.obtenerTodasLasUnidades(idEquipo);

    return {
      success: true,
      data: unidades,
    };
  }
}
