import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncBatchResponseDto, SyncCompareResponseDto, SyncDownloadResponseDto } from './dto/sync-response.dto';
import { SyncBatchUploadDto } from './dto/sync-upload-orden.dto';
import { SyncService } from './sync.service';

/**
 * Controller de Sincronización Mobile - FASE 2.3
 * 
 * Endpoints para sincronización offline-first:
 * - POST /sync/ordenes - Subir batch de órdenes desde móvil
 * - GET /sync/download/:tecnicoId - Descargar datos para trabajo offline
 * 
 * Flujo típico:
 * 1. Técnico descarga datos al inicio del día (GET /sync/download/:id)
 * 2. Trabaja offline en cuarto de máquinas
 * 3. Al recuperar conexión, sube todos los cambios (POST /sync/ordenes)
 * 4. Backend procesa, detecta conflictos y retorna resultado
 */
@ApiTags('Sincronización Mobile')
@ApiBearerAuth()
@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) { }

  /**
   * POST /api/sync/ordenes - Batch upload desde móvil
   */
  @Post('ordenes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sincronizar órdenes desde móvil (batch upload)',
    description: `
      Recibe múltiples órdenes con sus cambios (estado, mediciones, actividades).
      Procesa cada orden en transacción aislada.
      Retorna resultado por orden incluyendo mapeo de IDs locales → servidor.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch procesado (ver resultados individuales)',
    type: SyncBatchResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async uploadOrdenes(
    @Body() dto: SyncBatchUploadDto,
  ): Promise<SyncBatchResponseDto> {
    return await this.syncService.syncBatchUpload(dto);
  }

  /**
   * GET /api/sync/download/:tecnicoId - Descargar datos para offline
   * 
   * Soporta SYNC DELTA: si se proporciona `since`, solo retorna cambios
   * desde esa fecha (ISO 8601). Sin `since`, retorna datos completos.
   */
  @Get('download/:tecnicoId')
  @ApiOperation({
    summary: 'Descargar datos para trabajo offline (soporta delta sync)',
    description: `
      Retorna datos necesarios para que el técnico trabaje sin conexión.
      
      **Sync Completo (sin parámetro 'since'):**
      - Todas las órdenes asignadas activas y completadas recientes
      - Catálogos completos (parámetros, actividades, estados, tipos)
      
      **Sync Delta (con parámetro 'since'):**
      - Solo órdenes modificadas desde la fecha indicada
      - Catálogos solo si fueron modificados (o siempre en primera sync)
      
      Usar sync delta para sincronizaciones periódicas (más eficiente).
    `,
  })
  @ApiParam({
    name: 'tecnicoId',
    description: 'ID del técnico (empleado)',
    type: Number,
  })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Timestamp ISO 8601 para sync delta. Si se omite, retorna todos los datos.',
    example: '2025-12-12T10:00:00.000Z',
  })
  @ApiQuery({
    name: 'fullCatalogs',
    required: false,
    description: 'Forzar descarga de catálogos completos incluso en sync delta',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Datos para trabajo offline',
    type: SyncDownloadResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async downloadForTecnico(
    @Param('tecnicoId', ParseIntPipe) tecnicoId: number,
    @Query('since') since?: string,
    @Query('fullCatalogs') fullCatalogs?: string,
  ): Promise<SyncDownloadResponseDto> {
    const sinceDate = since ? new Date(since) : undefined;
    const includeCatalogs = fullCatalogs === 'true' || !sinceDate;

    return await this.syncService.downloadForTecnico(
      tecnicoId,
      sinceDate,
      includeCatalogs,
    );
  }

  // ============================================================================
  // SINCRONIZACIÓN INTELIGENTE - Comparación BD Local vs Supabase
  // ============================================================================

  /**
   * GET /api/sync/compare/:tecnicoId - Obtener resúmenes para comparación inteligente
   * 
   * Retorna un resumen ligero de las últimas N órdenes del técnico.
   * El móvil usa esto para comparar con su BD local y detectar diferencias.
   */
  @Get('compare/:tecnicoId')
  @ApiOperation({
    summary: 'Obtener resúmenes de órdenes para sincronización inteligente',
    description: `
      Retorna resúmenes compactos (~100 bytes/orden) de las últimas N órdenes.
      El móvil compara estos resúmenes con su BD local para detectar:
      - Órdenes nuevas en servidor (completadas en otro dispositivo)
      - Órdenes con estado diferente
      - Órdenes que necesitan sincronización
      
      Este enfoque NO depende de timestamps y es más robusto.
    `,
  })
  @ApiParam({
    name: 'tecnicoId',
    description: 'ID del técnico (empleado)',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número máximo de órdenes a comparar (default: 500)',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Resúmenes de órdenes para comparación',
    type: SyncCompareResponseDto,
  })
  async compareForTecnico(
    @Param('tecnicoId', ParseIntPipe) tecnicoId: number,
    @Query('limit') limit?: string,
  ): Promise<SyncCompareResponseDto> {
    const limitNum = limit ? parseInt(limit, 10) : 500;
    return await this.syncService.getOrdenesResumen(tecnicoId, limitNum);
  }

  /**
   * GET /api/sync/orden/:ordenId - Descargar una orden específica completa
   * 
   * Usado por el móvil cuando detecta que necesita actualizar una orden específica.
   */
  @Get('orden/:ordenId')
  @ApiOperation({
    summary: 'Descargar una orden específica completa',
    description: 'Retorna todos los datos de una orden específica para sincronización.',
  })
  @ApiParam({
    name: 'ordenId',
    description: 'ID de la orden a descargar',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Datos completos de la orden',
  })
  async downloadOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ): Promise<any> {
    return await this.syncService.getOrdenCompleta(ordenId);
  }
}
