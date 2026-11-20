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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreatePlantillaCotizacionDto,
  UpdatePlantillaCotizacionDto,
} from './plantillas-cotizacion.dto';
import { PlantillasCotizacionService } from './plantillas-cotizacion.service';

@ApiTags('Cotizaciones - Hub de Plantillas CPQ')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cotizaciones/plantillas')
export class PlantillasCotizacionController {
  constructor(private readonly plantillasService: PlantillasCotizacionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar plantillas reutilizables de cotización' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tipo_cotizacion', required: false })
  @ApiQuery({ name: 'id_tipo_equipo', required: false, type: Number })
  @ApiQuery({ name: 'id_modelo_equipo', required: false, type: Number })
  @ApiQuery({ name: 'incluir_inactivas', required: false, type: Boolean })
  async listar(
    @Query('search') search?: string,
    @Query('tipo_cotizacion') tipoCotizacion?: string,
    @Query('id_tipo_equipo') idTipoEquipo?: string,
    @Query('id_modelo_equipo') idModeloEquipo?: string,
    @Query('incluir_inactivas') incluirInactivas?: string,
  ) {
    return this.plantillasService.listar({
      search,
      tipo_cotizacion: tipoCotizacion,
      id_tipo_equipo: idTipoEquipo ? parseInt(idTipoEquipo, 10) : undefined,
      id_modelo_equipo: idModeloEquipo ? parseInt(idModeloEquipo, 10) : undefined,
      solo_activas: incluirInactivas === 'true' ? false : true,
    });
  }

  @Get(':idPlantilla')
  @ApiOperation({ summary: 'Obtener detalle completo de una plantilla de cotización' })
  async obtener(@Param('idPlantilla', ParseIntPipe) idPlantilla: number) {
    return this.plantillasService.obtenerPorId(idPlantilla);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva plantilla estándar de cotización (CPQ)' })
  async crear(
    @Body() dto: CreatePlantillaCotizacionDto,
    @CurrentUser('id') userId?: number,
  ) {
    return this.plantillasService.crear(dto, userId);
  }

  @Put(':idPlantilla')
  @ApiOperation({ summary: 'Actualizar plantilla de cotización e ítems' })
  async actualizar(
    @Param('idPlantilla', ParseIntPipe) idPlantilla: number,
    @Body() dto: UpdatePlantillaCotizacionDto,
  ) {
    return this.plantillasService.actualizar(idPlantilla, dto);
  }

  @Delete(':idPlantilla')
  @ApiOperation({ summary: 'Desactivar plantilla de cotización' })
  async eliminar(@Param('idPlantilla', ParseIntPipe) idPlantilla: number) {
    return this.plantillasService.eliminar(idPlantilla);
  }
}
