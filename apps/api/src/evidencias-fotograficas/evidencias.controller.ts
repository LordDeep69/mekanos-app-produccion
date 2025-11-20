import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../mediciones-servicio/decorators/user-id.decorator';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { CreateEvidenciaCommand } from './application/commands/create-evidencia.command';
import { GetEvidenciaByIdQuery } from './application/queries/get-evidencia-by-id.query';
import { GetEvidenciasByOrdenQuery } from './application/queries/get-evidencias-by-orden.query';

/**
 * Controller evidencias fotográficas con upload REAL a Cloudinary
 * FASE 4.3 - Multer file upload + metadata automática
 */

@Controller('evidencias-fotograficas')
@UseGuards(JwtAuthGuard)
export class EvidenciasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Upload evidencia fotográfica a Cloudinary
   * POST /api/evidencias-fotograficas
   * Content-Type: multipart/form-data
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
          return cb(
            new BadRequestException(
              'Solo se permiten archivos de imagen (JPEG, PNG, WebP)',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadEvidencia(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateEvidenciaDto,
    @UserId() userId: number,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo de imagen requerido');
    }

    const command = new CreateEvidenciaCommand(dto, file, userId);
    const evidencia = await this.commandBus.execute(command);

    return {
      success: true,
      message: 'Evidencia subida correctamente a Cloudinary',
      data: evidencia,
    };
  }

  /**
   * Obtener evidencia por ID
   * GET /api/evidencias-fotograficas/:id
   */
  @Get(':id')
  async obtenerEvidencia(@Param('id', ParseIntPipe) id: number) {
    const query = new GetEvidenciaByIdQuery(id);
    const evidencia = await this.queryBus.execute(query);

    return {
      success: true,
      data: evidencia,
    };
  }

  /**
   * Listar evidencias por orden de servicio
   * GET /api/evidencias-fotograficas/orden/:ordenId
   */
  @Get('orden/:ordenId')
  async listarEvidenciasPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ) {
    const query = new GetEvidenciasByOrdenQuery(ordenId);
    const result = await this.queryBus.execute(query);

    return {
      success: true,
      message: `Se encontraron ${result.total} evidencias para la orden ${ordenId}`,
      data: result.evidencias,
      total: result.total,
    };
  }
}
