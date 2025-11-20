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
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActualizarCatalogoSistemaCommand } from './application/commands/actualizar-catalogo-sistema.command';
import { CrearCatalogoSistemaCommand } from './application/commands/crear-catalogo-sistema.command';
import { DesactivarCatalogoSistemaCommand } from './application/commands/desactivar-catalogo-sistema.command';
import { GetCatalogoSistemaByIdQuery } from './application/queries/get-catalogo-sistema-by-id.query';
import { GetCatalogoSistemasQuery } from './application/queries/get-catalogo-sistemas.query';
import { CreateCatalogoSistemasDto } from './dto/create-catalogo-sistemas.dto';
import { UpdateCatalogoSistemasDto } from './dto/update-catalogo-sistemas.dto';

@Controller('catalogo-sistemas')
@Public()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogoSistemasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() dto: CreateCatalogoSistemasDto) {
    return this.commandBus.execute(
      new CrearCatalogoSistemaCommand(
        dto.codigo_sistema,
        dto.nombre_sistema,
        dto.aplica_a,
        dto.orden_visualizacion,
        dto.descripcion,
        dto.icono,
        dto.color_hex,
        dto.observaciones,
      ),
    );
  }

  @Get()
  async findAll(
    @Query('activo') activo?: string,
    @Query('aplica_a') aplica_a?: string,
    @Query('orden_min') orden_min?: string,
    @Query('orden_max') orden_max?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.queryBus.execute(
      new GetCatalogoSistemasQuery(
        activo === 'true' ? true : activo === 'false' ? false : undefined,
        aplica_a,
        orden_min ? parseInt(orden_min) : undefined,
        orden_max ? parseInt(orden_max) : undefined,
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 10,
      ),
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.queryBus.execute(new GetCatalogoSistemaByIdQuery(id));
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCatalogoSistemasDto,
  ) {
    return this.commandBus.execute(
      new ActualizarCatalogoSistemaCommand(
        id,
        dto.codigo_sistema,
        dto.nombre_sistema,
        dto.aplica_a,
        dto.orden_visualizacion,
        dto.descripcion,
        dto.icono,
        dto.color_hex,
        dto.observaciones,
      ),
    );
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.commandBus.execute(new DesactivarCatalogoSistemaCommand(id));
  }
}
