import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BitacorasService } from './bitacoras.service';
import { CreateBitacorasDto } from './dto/create-bitacoras.dto';
import { UpdateBitacorasDto } from './dto/update-bitacoras.dto';

@Controller('bitacoras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BitacorasController {
  constructor(private readonly bitacorasService: BitacorasService) { }

  // ═══════════════════════════════════════════════════════════════
  // NUEVOS ENDPOINTS: Módulo Bitácora (preview + enviar + historial)
  // ═══════════════════════════════════════════════════════════════

  @Get('preview/:idCliente')
  async previewInformes(
    @Param('idCliente', ParseIntPipe) idCliente: number,
    @Query('mes') mesStr: string,
    @Query('anio') anioStr: string,
    @Query('categoria') categoria?: string,
  ) {
    const mes = parseInt(mesStr, 10);
    const anio = parseInt(anioStr, 10);

    if (!mes || mes < 1 || mes > 12) {
      return { success: false, error: 'Mes inválido (1-12)' };
    }
    if (!anio || anio < 2020 || anio > 2030) {
      return { success: false, error: 'Año inválido (2020-2030)' };
    }

    const result = await this.bitacorasService.previewInformesPorSede(
      idCliente, mes, anio, categoria || undefined,
    );

    return { success: true, data: result };
  }

  @Post('enviar')
  async enviarBitacora(@Body() dto: any, @Req() req: any) {
    const userId = req.user?.id_usuario || req.user?.sub || 1;

    const result = await this.bitacorasService.crearYEnviarBitacora({
      id_cliente_principal: dto.id_cliente_principal,
      mes: dto.mes,
      anio: dto.anio,
      categoria: dto.categoria,
      documentos_ids: dto.documentos_ids,
      nombres_pdf: dto.nombres_pdf,
      email_destino: dto.email_destino,
      emails_cc: dto.emails_cc,
      asunto_personalizado: dto.asunto_personalizado,
      mensaje_personalizado: dto.mensaje_personalizado,
      usuario_id: userId,
    });

    return { success: result.success, data: result };
  }

  @Get('historial/:idCliente')
  async historial(@Param('idCliente', ParseIntPipe) idCliente: number) {
    const data = await this.bitacorasService.historialPorCliente(idCliente);
    return { success: true, data };
  }

  @Get('meses-disponibles/:idCliente')
  async mesesDisponibles(
    @Param('idCliente', ParseIntPipe) idCliente: number,
    @Query('categoria') categoria?: string,
  ) {
    const data = await this.bitacorasService.mesesDisponibles(idCliente, categoria || undefined);
    return { success: true, data };
  }

  // ═══════════════════════════════════════════════════════════════
  // CRUD BÁSICO (existente)
  // ═══════════════════════════════════════════════════════════════

  @Post()
  create(@Body() createDto: CreateBitacorasDto) {
    return this.bitacorasService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.bitacorasService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bitacorasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBitacorasDto,
  ) {
    return this.bitacorasService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bitacorasService.remove(id);
  }
}
