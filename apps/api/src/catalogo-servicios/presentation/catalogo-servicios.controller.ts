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
  async crear(@Body() dto: any) {
    const command = new CrearCatalogoServicioCommand(
      dto.codigoServicio ?? dto.codigo_servicio,
      dto.nombreServicio ?? dto.nombre_servicio,
      dto.categoria,
      dto.descripcion,
      dto.tipoServicioId ?? dto.id_tipo_servicio,
      dto.tipoEquipoId ?? dto.id_tipo_equipo,
      dto.duracionEstimadaHoras ?? dto.duracion_estimada_horas,
      dto.requiereCertificacion ?? dto.requiere_certificacion,
      dto.tipoCertificacionRequerida ?? dto.tipo_certificacion_requerida,
      dto.precioBase ?? dto.precio_base,
      dto.incluyeRepuestos ?? dto.incluye_repuestos,
      dto.activo,
      dto.observaciones,
      dto.creadoPor ?? dto.creado_por,
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
    @Query('idTipoServicio') idTipoServicio?: string,
    @Query('tipoEquipoId') tipoEquipoId?: string,
    @Query('idTipoEquipo') idTipoEquipo?: string,
    @Query('limit') limit?: string,
  ) {
    const sId = tipoServicioId || idTipoServicio;
    const eId = tipoEquipoId || idTipoEquipo;
    const query = new ListarCatalogosServicioQuery(
      activo === 'true' ? true : activo === 'false' ? false : undefined,
      categoria,
      sId ? parseInt(sId) : undefined,
      eId ? parseInt(eId) : undefined,
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
    @Body() dto: any,
  ) {
    const command = new ActualizarCatalogoServicioCommand(
      id,
      dto.nombreServicio ?? dto.nombre_servicio,
      dto.descripcion,
      dto.categoria,
      dto.tipoServicioId ?? dto.id_tipo_servicio,
      dto.tipoEquipoId ?? dto.id_tipo_equipo,
      dto.duracionEstimadaHoras ?? dto.duracion_estimada_horas,
      dto.requiereCertificacion ?? dto.requiere_certificacion,
      dto.tipoCertificacionRequerida ?? dto.tipo_certificacion_requerida,
      dto.precioBase ?? dto.precio_base,
      dto.incluyeRepuestos ?? dto.incluye_repuestos,
      dto.activo,
      dto.observaciones,
      dto.modificadoPor ?? dto.modificado_por,
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
