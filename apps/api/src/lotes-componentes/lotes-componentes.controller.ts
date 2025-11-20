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
import { UserId } from '../common/decorators/user-id.decorator';
import { CrearLoteCommand } from './commands/crear-lote.command';
import { CrearLoteDto } from './dto/crear-lote.dto';
import { GetLoteByIdQuery } from './queries/get-lote-by-id.query';
import { GetLotesQuery } from './queries/get-lotes.query';
import { GetProximosAVencerQuery } from './queries/get-proximos-a-vencer.query';

@Controller('lotes-componentes')
@UseGuards(JwtAuthGuard)
export class LotesComponentesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async crear(@Body() dto: CrearLoteDto, @UserId() userId: number) {
    const command = new CrearLoteCommand(
      dto.codigo_lote,
      dto.id_componente,
      dto.cantidad_inicial,
      userId,
      dto.fecha_fabricacion ? new Date(dto.fecha_fabricacion) : undefined,
      dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : undefined,
      dto.id_proveedor,
      dto.numero_factura_proveedor,
      dto.observaciones,
    );
    return this.commandBus.execute(command);
  }

  @Get()
  async findAll(
    @Query('id_componente')
    id_componente?: number,
    @Query('estado_lote') estado_lote?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const query = new GetLotesQuery(id_componente, estado_lote, page, limit);
    return this.queryBus.execute(query);
  }

  @Get('proximos-a-vencer')
  async getProximosAVencer(
    @Query('dias')
    dias: number = 30,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const query = new GetProximosAVencerQuery(dias, page, limit);
    return this.queryBus.execute(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const query = new GetLoteByIdQuery(id);
    return this.queryBus.execute(query);
  }
}
