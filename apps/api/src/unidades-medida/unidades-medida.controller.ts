import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryUnidadMedidaDto } from './dto/query-unidad-medida.dto';
import { UnidadesMedidaService } from './unidades-medida.service';

@ApiTags('Unidades de Medida')
@ApiBearerAuth()
@Controller('unidades-medida')
@UseGuards(JwtAuthGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesService: UnidadesMedidaService) {}

  /**
   * Listar unidades activas ordenadas por tipo_magnitud.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar unidades de medida normalizadas (Solo lectura)',
    description:
      'Devuelve las unidades de medida activas del sistema ordenadas por su tipo de magnitud física (CANTIDAD, VOLUMEN, LONGITUD, MASA, CONJUNTO).',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de unidades de medida ordenadas por magnitud.',
  })
  async findAll(@Query() query: QueryUnidadMedidaDto) {
    return this.unidadesService.findAll(query);
  }

  /**
   * Obtener detalle de una unidad por código.
   */
  @Get(':codigo')
  @ApiOperation({ summary: 'Obtener información técnica de una unidad de medida por su código' })
  @ApiResponse({ status: 200, description: 'Unidad de medida encontrada.' })
  @ApiResponse({ status: 404, description: 'Unidad de medida no encontrada.' })
  async findOne(@Param('codigo') codigo: string) {
    return this.unidadesService.findOne(codigo);
  }
}
