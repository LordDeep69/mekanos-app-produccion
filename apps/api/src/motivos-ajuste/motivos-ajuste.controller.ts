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
import { categoria_motivo_ajuste_enum } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarMotivoAjusteCommand } from './application/commands/actualizar-motivo-ajuste.command';
import { CrearMotivoAjusteCommand } from './application/commands/crear-motivo-ajuste.command';
import { DesactivarMotivoAjusteCommand } from './application/commands/desactivar-motivo-ajuste.command';
import { GetMotivoAjusteByIdQuery } from './application/queries/get-motivo-ajuste-by-id.query';
import { GetMotivosAjusteQuery } from './application/queries/get-motivos-ajuste.query';
import { CreateMotivosAjusteDto } from './dto/create-motivos-ajuste.dto';
import { UpdateMotivosAjusteDto } from './dto/update-motivos-ajuste.dto';

@Controller('motivos-ajuste')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MotivosAjusteController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() createDto: CreateMotivosAjusteDto) {
    const command = new CrearMotivoAjusteCommand(
      createDto.codigo_motivo,
      createDto.nombre_motivo,
      createDto.categoria,
      createDto.requiere_justificacion_detallada,
      createDto.requiere_aprobacion_gerencia,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('activo') activoStr?: string,
    @Query('categoria') categoria?: categoria_motivo_ajuste_enum,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const activo =
      activoStr !== undefined ? activoStr === 'true' : undefined;

    const query = new GetMotivosAjusteQuery(page, limit, activo, categoria);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetMotivoAjusteByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMotivosAjusteDto,
  ) {
    const command = new ActualizarMotivoAjusteCommand(
      id,
      updateDto.codigo_motivo,
      updateDto.nombre_motivo,
      updateDto.categoria,
      updateDto.requiere_justificacion_detallada,
      updateDto.requiere_aprobacion_gerencia,
      updateDto.activo,
    );
    return this.commandBus.execute(command);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const command = new DesactivarMotivoAjusteCommand(id);
    return this.commandBus.execute(command);
  }
}
