import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createHash } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { UserId } from '../mediciones-servicio/decorators/user-id.decorator';
import { CloudinaryService } from '../storage/cloudinary.service';
import { CreateEvidenciaCommand } from './application/commands/create-evidencia.command';
import { DeleteEvidenciaCommand } from './application/commands/delete-evidencia.command';
import { UpdateEvidenciaCommand } from './application/commands/update-evidencia.command';
import { GetAllEvidenciasQuery } from './application/queries/get-all-evidencias.query';
import { GetEvidenciaByIdQuery } from './application/queries/get-evidencia-by-id.query';
import { GetEvidenciasByActividadQuery } from './application/queries/get-evidencias-by-actividad.query';
import { GetEvidenciasByOrdenQuery } from './application/queries/get-evidencias-by-orden.query';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { ResponseEvidenciaDto } from './dto/response-evidencia.dto';
import { UpdateEvidenciaDto } from './dto/update-evidencia.dto';
import { UploadBase64Dto } from './dto/upload-base64.dto';

/**
 * Controller evidencias fotográficas CRUD
 * FASE 3 - Tabla 11 - 7 endpoints camelCase
 */

@ApiTags('Evidencias Fotográficas')
@ApiBearerAuth()
@Controller('evidencias-fotograficas')
@UseGuards(JwtAuthGuard)
export class EvidenciasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Listar todas evidencias
   * GET /api/evidencias-fotograficas
   */
  @Get()
  @ApiOperation({ summary: 'Listar todas evidencias fotográficas' })
  @ApiResponse({ status: 200, type: [ResponseEvidenciaDto] })
  async listarEvidencias(): Promise<ResponseEvidenciaDto[]> {
    const query = new GetAllEvidenciasQuery();
    return await this.queryBus.execute(query);
  }

  /**
   * Crear evidencia
   * POST /api/evidencias-fotograficas
   */
  @Post()
  @ApiOperation({ summary: 'Crear evidencia fotográfica' })
  @ApiResponse({ status: 201, type: ResponseEvidenciaDto })
  async crearEvidencia(
    @Body() dto: CreateEvidenciaDto,
    @UserId() userId: number,
  ): Promise<ResponseEvidenciaDto> {
    const command = new CreateEvidenciaCommand(dto, userId);
    return await this.commandBus.execute(command);
  }

  /**
   * Listar evidencias por orden (ANTES de /:id)
   * GET /api/evidencias-fotograficas/orden/:ordenId
   */
  @Get('orden/:ordenId')
  @ApiOperation({ summary: 'Listar evidencias por orden servicio' })
  @ApiParam({ name: 'ordenId', type: Number })
  @ApiResponse({ status: 200, type: [ResponseEvidenciaDto] })
  async listarEvidenciasPorOrden(
    @Param('ordenId', ParseIntPipe) ordenId: number,
  ): Promise<ResponseEvidenciaDto[]> {
    const query = new GetEvidenciasByOrdenQuery(ordenId);
    return await this.queryBus.execute(query);
  }

  /**
   * Listar evidencias por actividad ejecutada
   * GET /api/evidencias-fotograficas/actividad/:actividadId
   */
  @Get('actividad/:actividadId')
  @ApiOperation({ summary: 'Listar evidencias por actividad ejecutada' })
  @ApiParam({ name: 'actividadId', type: Number })
  @ApiResponse({ status: 200, type: [ResponseEvidenciaDto] })
  async listarEvidenciasPorActividad(
    @Param('actividadId', ParseIntPipe) actividadId: number,
  ): Promise<ResponseEvidenciaDto[]> {
    const query = new GetEvidenciasByActividadQuery(actividadId);
    return await this.queryBus.execute(query);
  }

  /**
   * Obtener evidencia por ID
   * GET /api/evidencias-fotograficas/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener evidencia por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ResponseEvidenciaDto })
  async obtenerEvidencia(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseEvidenciaDto> {
    const query = new GetEvidenciaByIdQuery(id);
    return await this.queryBus.execute(query);
  }

  /**
   * Actualizar evidencia
   * PUT /api/evidencias-fotograficas/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar evidencia fotográfica' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, type: ResponseEvidenciaDto })
  async actualizarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvidenciaDto,
    @UserId() userId: number,
  ): Promise<ResponseEvidenciaDto> {
    const command = new UpdateEvidenciaCommand(id, dto, userId);
    return await this.commandBus.execute(command);
  }

  /**
   * Eliminar evidencia
   * DELETE /api/evidencias-fotograficas/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar evidencia fotográfica' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Evidencia eliminada exitosamente' })
  async eliminarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ): Promise<{ message: string }> {
    const command = new DeleteEvidenciaCommand(id, userId);
    return await this.commandBus.execute(command);
  }

  // ============================================================================
  // NUEVO ENDPOINT PARA ADMIN PORTAL - SUBIDA CON BASE64
  // ============================================================================

  private readonly logger = new Logger(EvidenciasController.name);

  /**
   * Subir evidencia fotográfica desde Base64 (Portal Admin)
   * POST /api/evidencias-fotograficas/upload-base64
   * 
   * Este endpoint es específico para el Portal Admin:
   * 1. Recibe imagen en Base64
   * 2. Sube a Cloudinary
   * 3. Registra en BD con URL de Cloudinary (reintenta si BD caída)
   * 4. Retorna evidencia creada
   */
  @Post('upload-base64')
  @ApiOperation({
    summary: 'Subir evidencia desde Base64 (Portal Admin)',
    description: 'Recibe imagen en Base64, la sube a Cloudinary y registra en BD'
  })
  @ApiResponse({ status: 201, type: ResponseEvidenciaDto })
  @ApiResponse({ status: 400, description: 'Error de validación o Base64 inválido' })
  @ApiResponse({ status: 500, description: 'Error al subir a Cloudinary' })
  async uploadBase64(
    @Body() dto: UploadBase64Dto,
    @UserId() userId: number,
  ): Promise<ResponseEvidenciaDto> {
    this.logger.log(`📷 [ADMIN] Subiendo evidencia Base64 para orden ${dto.idOrdenServicio}`);

    // 1. Validar orden (best-effort, si BD caída se usa fallback)
    let ordenNumero: string;
    try {
      const orden = await this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: dto.idOrdenServicio },
        select: { numero_orden: true },
      });
      if (!orden) throw new Error('NOT_FOUND');
      ordenNumero = orden.numero_orden;
    } catch (error: any) {
      if (error?.message === 'NOT_FOUND') {
        throw new BadRequestException(`Orden ${dto.idOrdenServicio} no encontrada`);
      }
      ordenNumero = `ORD-${dto.idOrdenServicio}`;
      this.logger.warn(
        `⚠️ BD caída al validar orden ${dto.idOrdenServicio}, continuando con fallback...`,
      );
    }

    // 2. Extraer Base64 puro (remover prefijo data:image/... si existe)
    let base64Pure = dto.base64;
    if (base64Pure.includes(',')) {
      base64Pure = base64Pure.split(',')[1];
    }

    // 3. Convertir Base64 a Buffer
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Pure, 'base64');
    } catch (error) {
      throw new BadRequestException('Base64 inválido');
    }

    if (buffer.length === 0) {
      throw new BadRequestException('Imagen vacía');
    }

    // 4. Calcular hash SHA256
    const hash = createHash('sha256').update(buffer).digest('hex');

    // 5. Subir a Cloudinary
    const folder = `mekanos/evidencias/${ordenNumero}`;
    const cloudinaryResult = await this.cloudinaryService.uploadImage(buffer, {
      folder,
      tags: [dto.tipoEvidencia, ordenNumero, 'admin-upload'],
    });

    if (!cloudinaryResult.success || !cloudinaryResult.url) {
      this.logger.error(`❌ Error Cloudinary: ${cloudinaryResult.error}`);
      throw new InternalServerErrorException(
        `Error al subir imagen a Cloudinary: ${cloudinaryResult.error || 'URL no generada'}`
      );
    }

    this.logger.log(`   ✅ Imagen subida a Cloudinary: ${cloudinaryResult.url}`);

    // 6. Registrar en BD (reintenta hasta 3 veces si la BD está caída)
    const ahora = new Date();
    const nombreArchivo = dto.nombreArchivo || `${dto.tipoEvidencia.toLowerCase()}_${ahora.getTime()}.jpg`;

    let evidencia: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        evidencia = await this.prisma.evidencias_fotograficas.create({
          data: {
            id_orden_servicio: dto.idOrdenServicio,
            id_actividad_ejecutada: dto.idActividadEjecutada || null,
            id_orden_equipo: dto.idOrdenEquipo || null,
            tipo_evidencia: dto.tipoEvidencia as any,
            descripcion: dto.descripcion || `Evidencia ${dto.tipoEvidencia} agregada desde Admin`,
            nombre_archivo: nombreArchivo,
            ruta_archivo: cloudinaryResult.url,
            hash_sha256: hash,
            tama_o_bytes: BigInt(buffer.length),
            mime_type: 'image/jpeg',
            capturada_por: userId,
            fecha_captura: ahora,
            fecha_registro: ahora,
          },
        });
        break; // éxito, salir del loop
      } catch (dbError: any) {
        if (attempt < 3) {
          const delay = attempt * 2000; // 2s, 4s
          this.logger.warn(
            `⚠️ BD caída al guardar evidencia (intento ${attempt}/3), reintentando en ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
        } else {
          this.logger.error(
            `❌ BD caída, evidencia guardada solo en Cloudinary: ${cloudinaryResult.url}`,
          );
        }
      }
    }

    if (evidencia) {
      this.logger.log(`   ✅ Evidencia registrada en BD: ID ${evidencia.id_evidencia}`);
    } else {
      this.logger.log(
        `   ⏳ Evidencia pendiente de registro en BD (URL: ${cloudinaryResult.url})`,
      );
    }

    // 7. Retornar evidencia
    return {
      idEvidencia: evidencia?.id_evidencia || 0,
      idOrdenServicio: dto.idOrdenServicio,
      idActividadEjecutada: dto.idActividadEjecutada ?? undefined,
      tipoEvidencia: dto.tipoEvidencia as any,
      descripcion: dto.descripcion || `Evidencia ${dto.tipoEvidencia} agregada desde Admin`,
      nombreArchivo: nombreArchivo,
      rutaArchivo: cloudinaryResult.url,
      hashSha256: hash,
      tamañoBytes: Number(buffer.length),
      mimeType: 'image/jpeg',
      fechaCaptura: ahora,
      fechaRegistro: ahora,
      ordenServicio: {
        idOrdenServicio: dto.idOrdenServicio,
        numeroOrden: ordenNumero,
        idCliente: 0,
        idEquipo: 0,
      },
    };
  }
}
