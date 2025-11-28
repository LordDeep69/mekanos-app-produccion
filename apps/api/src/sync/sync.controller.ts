import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncBatchResponseDto, SyncDownloadResponseDto } from './dto/sync-response.dto';
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
  constructor(private readonly syncService: SyncService) {}

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
   */
  @Get('download/:tecnicoId')
  @ApiOperation({
    summary: 'Descargar datos para trabajo offline',
    description: `
      Retorna todos los datos necesarios para que el técnico trabaje sin conexión:
      - Órdenes asignadas (no finalizadas)
      - Parámetros de medición con rangos
      - Catálogo de actividades
      - Estados de orden disponibles
      
      El técnico debe llamar este endpoint antes de perder conexión.
    `,
  })
  @ApiParam({
    name: 'tecnicoId',
    description: 'ID del técnico (empleado)',
    type: Number,
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
  ): Promise<SyncDownloadResponseDto> {
    return await this.syncService.downloadForTecnico(tecnicoId);
  }
}
