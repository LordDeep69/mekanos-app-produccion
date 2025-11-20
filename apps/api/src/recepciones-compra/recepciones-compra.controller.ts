import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { RegistrarRecepcionCommand } from './application/commands/registrar-recepcion.command';
import { GetRecepcionByIdQuery } from './application/queries/get-recepcion-by-id.query';
import { GetRecepcionesQuery } from './application/queries/get-recepciones.query';
import { CreateRecepcionesCompraDto } from './dto/create-recepciones-compra.dto';

@Controller('recepciones-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecepcionesCompraController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @Body() createDto: CreateRecepcionesCompraDto,
    @UserId() userId: number,
  ) {
    return this.commandBus.execute(
      new RegistrarRecepcionCommand(
        createDto.id_orden_compra,
        createDto.id_detalle_orden,
        createDto.cantidad_recibida,
        createDto.cantidad_aceptada,
        createDto.cantidad_rechazada,
        createDto.tipo_recepcion,
        createDto.calidad,
        userId,
        createDto.id_ubicacion_destino,
        createDto.observaciones,
        createDto.costo_unitario_real,
      ),
    );
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('id_orden_compra') idOrdenCompraStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    const id_orden_compra = idOrdenCompraStr ? parseInt(idOrdenCompraStr, 10) : undefined;
    return this.queryBus.execute(
      new GetRecepcionesQuery(page, limit, id_orden_compra),
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.queryBus.execute(new GetRecepcionByIdQuery(id));
  }
}
