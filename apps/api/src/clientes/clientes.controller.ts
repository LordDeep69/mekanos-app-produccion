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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientesService } from './clientes.service';
import { CreateClientesDto } from './dto/create-clientes.dto';
import { UpdateClientesDto } from './dto/update-clientes.dto';

@ApiTags('FASE 2 - Clientes')
@ApiBearerAuth('JWT-auth')
@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) { }

  @Post()
  create(
    @Body() createDto: CreateClientesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.clientesService.create(createDto, userId);
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Endpoint LIGERO para selectores
   * Retorna solo id, nombre y NIT - ideal para dropdowns/autocomplete
   * 
   * @param q Término de búsqueda (nombre comercial, razón social, NIT)
   * @param limit Máximo de resultados (default 20)
   */
  @Get('selector')
  async getSelector(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '20'), 50); // Max 50
    const items = await this.clientesService.findForSelector(q, limitNum);

    return {
      success: true,
      data: items,
    };
  }

  @Get()
  async findAll(
    @Query('tipo_cliente') tipo_cliente?: string,
    @Query('cliente_activo') cliente_activo?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    const { items, total } = await this.clientesService.findAll({
      tipo_cliente,
      cliente_activo:
        cliente_activo !== undefined
          ? cliente_activo === 'true'
          : undefined,
      search,
      skip: skipNum,
      take: takeNum,
    });

    return {
      success: true,
      data: items,
      pagination: {
        total,
        skip: skipNum,
        take: takeNum,
        totalPages: Math.ceil(total / takeNum),
      },
    };
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
