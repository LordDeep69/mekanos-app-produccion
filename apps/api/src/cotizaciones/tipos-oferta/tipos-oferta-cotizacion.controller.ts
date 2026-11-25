import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateTipoOfertaCotizacionDto,
  UpdateTipoOfertaCotizacionDto,
} from './tipos-oferta-cotizacion.dto';
import { TiposOfertaCotizacionService } from './tipos-oferta-cotizacion.service';

@ApiTags('Cotizaciones - Catálogo Tipos de Oferta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones/tipos-oferta')
export class TiposOfertaCotizacionController {
  constructor(private readonly tiposService: TiposOfertaCotizacionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo unificado de tipos de oferta (COT + Plantillas)' })
  async listar() {
    return this.tiposService.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo tipo de oferta estandarizado en el catálogo' })
  async crear(@Body() dto: CreateTipoOfertaCotizacionDto) {
    return this.tiposService.crear(dto);
  }

  @Put(':codigo')
  @ApiOperation({ summary: 'Renombrar etiqueta o descripción de un tipo de oferta' })
  async actualizar(@Param('codigo') codigo: string, @Body() dto: UpdateTipoOfertaCotizacionDto) {
    return this.tiposService.actualizar(codigo, dto);
  }

  @Delete(':codigo')
  @ApiOperation({ summary: 'Eliminar tipo de oferta personalizado sin usos activos' })
  async eliminar(@Param('codigo') codigo: string) {
    return this.tiposService.eliminar(codigo);
  }
}
