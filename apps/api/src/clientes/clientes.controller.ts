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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientesService } from './clientes.service';
import { CreateClientesDto } from './dto/create-clientes.dto';
import { UpdateClientesDto } from './dto/update-clientes.dto';

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  create(
    @Body() createDto: CreateClientesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.clientesService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('tipo_cliente') tipo_cliente?: string,
    @Query('cliente_activo') cliente_activo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.clientesService.findAll({
      tipo_cliente,
      cliente_activo:
        cliente_activo !== undefined
          ? cliente_activo === 'true'
          : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateClientesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.clientesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }
}
