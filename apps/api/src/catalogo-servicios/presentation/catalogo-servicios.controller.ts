import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ActualizarCatalogoServicioCommand } from '../application/commands/actualizar-catalogo-servicio.command';
import { CrearCatalogoServicioCommand } from '../application/commands/crear-catalogo-servicio.command';
import { EliminarCatalogoServicioCommand } from '../application/commands/eliminar-catalogo-servicio.command';
import { BuscarPorCodigoQuery } from '../application/queries/buscar-por-codigo.query';
import { ListarCatalogosServicioQuery } from '../application/queries/listar-catalogos-servicio.query';
import { ObtenerCatalogoServicioPorIdQuery } from '../application/queries/obtener-catalogo-servicio-por-id.query';
import { ObtenerPorTipoServicioQuery } from '../application/queries/obtener-por-tipo-servicio.query';
import { ActualizarCatalogoServicioDto } from './dto/actualizar-catalogo-servicio.dto';
import { CrearCatalogoServicioDto } from './dto/crear-catalogo-servicio.dto';

@Controller('catalogo-servicios')
export class CatalogoServiciosController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crear(@Body() dto: CrearCatalogoServicioDto) {
    const command = new CrearCatalogoServicioCommand(
      dto.codigoServicio,
      dto.nombreServicio,
      dto.categoria,
      dto.descripcion,
      dto.tipoServicioId,
      dto.tipoEquipoId,
      dto.duracionEstimadaHoras,
      dto.requiereCertificacion,
      dto.tipoCertificacionRequerida,
      dto.precioBase,
      dto.incluyeRepuestos,
      dto.activo,
      dto.observaciones,
      dto.creadoPor,
    );

    const result = await this.commandBus.execute(command);

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Servicio creado exitosamente',
      data: result,
    };
  }

  @Get(':id')
  async obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    const query = new ObtenerCatalogoServicioPorIdQuery(id);
    const result = await this.queryBus.execute(query);

    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Get()
  async listar(
    @Query('activo') activo?: string,
    @Query('categoria') categoria?: string,
    @Query('tipoServicioId') tipoServicioId?: string,
    @Query('tipoEquipoId') tipoEquipoId?: string,
  ) {
    const query = new ListarCatalogosServicioQuery(
      activo === 'true' ? true : activo === 'false' ? false : undefined,
      categoria,
      tipoServicioId ? parseInt(tipoServicioId) : undefined,
      tipoEquipoId ? parseInt(tipoEquipoId) : undefined,
    );
    const result = await this.queryBus.execute(query);

    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Get('tipo-servicio/:tipoServicioId')
  async obtenerPorTipoServicio(@Param('tipoServicioId', ParseIntPipe) tipoServicioId: number) {
    const query = new ObtenerPorTipoServicioQuery(tipoServicioId);
    const result = await this.queryBus.execute(query);

    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Get('codigo/:codigo')
  async buscarPorCodigo(@Param('codigo') codigo: string) {
    const query = new BuscarPorCodigoQuery(codigo);
    const result = await this.queryBus.execute(query);

    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  @Put(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCatalogoServicioDto,
  ) {
    const command = new ActualizarCatalogoServicioCommand(
      id,
      dto.nombreServicio,
      dto.descripcion,
      dto.categoria,
      dto.tipoServicioId,
      dto.tipoEquipoId,
      dto.duracionEstimadaHoras,
      dto.requiereCertificacion,
      dto.tipoCertificacionRequerida,
      dto.precioBase,
      dto.incluyeRepuestos,
      dto.activo,
      dto.observaciones,
      dto.modificadoPor,
    );

    const result = await this.commandBus.execute(command);

    return {
      statusCode: HttpStatus.OK,
      message: 'Servicio actualizado exitosamente',
      data: result,
    };
  }

  @Delete(':id')
  async eliminar(@Param('id', ParseIntPipe) id: number) {
    const command = new EliminarCatalogoServicioCommand(id);
    const result = await this.commandBus.execute(command);

    return {
      statusCode: HttpStatus.OK,
      message: 'Servicio eliminado exitosamente (soft delete)',
      data: result,
    };
  }
}
