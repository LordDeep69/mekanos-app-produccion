import {
    Body,
    Controller,
    Get,
    Param,
    ParseBoolPipe,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActualizarUbicacionCommand } from './commands/actualizar-ubicacion.command';
import { CrearUbicacionCommand } from './commands/crear-ubicacion.command';
import { DesactivarUbicacionCommand } from './commands/desactivar-ubicacion.command';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { CrearUbicacionDto } from './dto/crear-ubicacion.dto';
import { GetUbicacionByIdQuery } from './queries/get-ubicacion-by-id.query';
import { GetUbicacionesQuery } from './queries/get-ubicaciones.query';

@Controller('ubicaciones-bodega')
@UseGuards(JwtAuthGuard)
export class UbicacionesBodegaController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async crear(@Body() dto: CrearUbicacionDto) {
    const command = new CrearUbicacionCommand(
      dto.codigo_ubicacion,
      dto.zona,
      dto.pasillo,
      dto.estante,
      dto.nivel,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('zona') zona?: string,
    @Query('activo', new ParseBoolPipe({ optional: true })) activo?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const query = new GetUbicacionesQuery(zona, activo, page, limit);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetUbicacionByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUbicacionDto,
  ) {
    const command = new ActualizarUbicacionCommand(
      id,
      dto.codigo_ubicacion,
      dto.zona,
      dto.pasillo,
      dto.estante,
      dto.nivel,
      dto.activo,
    );
    return this.commandBus.execute(command);
  }

  @Patch(':id/desactivar')
  async desactivar(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarUbicacionCommand(id);
    return this.commandBus.execute(command);
  }
}
