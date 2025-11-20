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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarEquipoGeneradorCommand } from './application/commands/actualizar-equipo-generador.command';
import { CrearEquipoGeneradorCommand } from './application/commands/crear-equipo-generador.command';
import { EliminarEquipoGeneradorCommand } from './application/commands/eliminar-equipo-generador.command';
import { GetAllEquiposGeneradorQuery } from './application/queries/get-all-equipos-generador.query';
import { GetEquipoGeneradorByIdQuery } from './application/queries/get-equipo-generador-by-id.query';
import { CreateEquipoGeneradorDto } from './dto/create-equipo-generador.dto';
import { UpdateEquipoGeneradorDto } from './dto/update-equipo-generador.dto';

@Controller('equipos-generador')
@Public()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposGeneradorController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateEquipoGeneradorDto,
    @CurrentUser('id') userId: number,
  ) {
    const command = new CrearEquipoGeneradorCommand(
      dto.id_equipo,
      dto.marca_generador,
      dto.voltaje_salida,
      userId,
      dto.modelo_generador,
      dto.numero_serie_generador,
      dto.marca_alternador,
      dto.modelo_alternador,
      dto.numero_serie_alternador,
      dto.potencia_kw,
      dto.potencia_kva,
      dto.factor_potencia,
      dto.numero_fases,
      dto.frecuencia_hz,
      dto.amperaje_nominal_salida,
      dto.tiene_avr,
      dto.marca_avr,
      dto.modelo_avr,
      dto.referencia_avr,
      dto.tiene_modulo_control,
      dto.marca_modulo_control,
      dto.modelo_modulo_control,
      dto.tiene_arranque_automatico,
      dto.capacidad_tanque_principal_litros,
      dto.tiene_tanque_auxiliar,
      dto.capacidad_tanque_auxiliar_litros,
      dto.clase_aislamiento,
      dto.grado_proteccion_ip,
      dto.año_fabricacion,
      dto.observaciones,
      dto.metadata,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('marca_generador') marca_generador?: string,
    @Query('tiene_avr') tiene_avr?: string,
    @Query('tiene_modulo_control') tiene_modulo_control?: string,
    @Query('tiene_arranque_automatico') tiene_arranque_automatico?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query = new GetAllEquiposGeneradorQuery({
      marca_generador,
      tiene_avr: tiene_avr !== undefined ? tiene_avr === 'true' : undefined,
      tiene_modulo_control: tiene_modulo_control !== undefined ? tiene_modulo_control === 'true' : undefined,
      tiene_arranque_automatico: tiene_arranque_automatico !== undefined ? tiene_arranque_automatico === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
    const result = await this.queryBus.execute(query);
    
    // Formato consistente con equipos.controller
    return {
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: query.filters.page || 1,
        limit: query.filters.limit || 50,
        totalPages: Math.ceil(result.total / (query.filters.limit || 50))
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetEquipoGeneradorByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipoGeneradorDto,
  ) {
    const command = new ActualizarEquipoGeneradorCommand(
      id,
      dto.marca_generador,
      dto.modelo_generador,
      dto.numero_serie_generador,
      dto.marca_alternador,
      dto.modelo_alternador,
      dto.numero_serie_alternador,
      dto.potencia_kw,
      dto.potencia_kva,
      dto.factor_potencia,
      dto.voltaje_salida,
      dto.numero_fases,
      dto.frecuencia_hz,
      dto.amperaje_nominal_salida,
      dto.tiene_avr,
      dto.marca_avr,
      dto.modelo_avr,
      dto.referencia_avr,
      dto.tiene_modulo_control,
      dto.marca_modulo_control,
      dto.modelo_modulo_control,
      dto.tiene_arranque_automatico,
      dto.capacidad_tanque_principal_litros,
      dto.tiene_tanque_auxiliar,
      dto.capacidad_tanque_auxiliar_litros,
      dto.clase_aislamiento,
      dto.grado_proteccion_ip,
      dto.año_fabricacion,
      dto.observaciones,
      dto.metadata,
      dto.modificado_por,
    );
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new EliminarEquipoGeneradorCommand(id);
    await this.commandBus.execute(command);
    return { success: true };
  }
}
