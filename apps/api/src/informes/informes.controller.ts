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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInformesDto } from './dto/create-informes.dto';
import { UpdateInformesDto } from './dto/update-informes.dto';
import { InformesService } from './informes.service';

@Controller('informes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InformesController {
  constructor(private readonly informesService: InformesService) { }

  /**
   * ✅ REPORTES MODULE 10-FEB-2026
   * GET /api/informes/reportes
   * Endpoint enriquecido para el módulo de Reportes del Portal Admin.
   * Devuelve informes con datos completos: documento PDF, orden, cliente, equipo, técnico.
   */
  @Get('reportes')
  findAllReportes(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('clienteId') clienteIdStr?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('tipoServicio') tipoServicioStr?: string,
    @Query('estadoInforme') estadoInforme?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.informesService.findAllReportes({
      page: pageStr ? parseInt(pageStr, 10) : undefined,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
      clienteId: clienteIdStr ? parseInt(clienteIdStr, 10) : undefined,
      fechaDesde,
      fechaHasta,
      tipoServicio: tipoServicioStr ? parseInt(tipoServicioStr, 10) : undefined,
      estadoInforme,
      busqueda,
    });
  }

  /**
   * ✅ REPORTES MODULE 10-FEB-2026
   * GET /api/informes/reportes/clientes
   * Lista clientes únicos que tienen informes generados (para filtro dropdown).
   */
  @Get('reportes/clientes')
  getClientesConInformes() {
    return this.informesService.getClientesConInformes();
  }

  @Post()
  create(@Body() createDto: CreateInformesDto) {
    return this.informesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.informesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.informesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateInformesDto,
  ) {
    return this.informesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.informesService.remove(id);
  }
}
