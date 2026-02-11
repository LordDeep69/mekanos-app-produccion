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
   * ✅ MULTI-SEDE: Listar clientes principales para selector "Es Sede de"
   * Retorna datos completos para auto-fill del formulario
   */
  @Get('principales')
  async getPrincipales(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '20'), 50);
    const items = await this.clientesService.findPrincipales(q, limitNum);
    return { success: true, data: items };
  }

  /**
   * ✅ OPTIMIZACIÓN 05-ENE-2026: Endpoint LIGERO para selectores
   * Retorna solo id, nombre y NIT - ideal para dropdowns/autocomplete
   * ✅ 31-ENE-2026: MULTI-ASESOR - Filtra por asesor si NO es admin
   * 
   * @param q Término de búsqueda (nombre comercial, razón social, NIT)
   * @param limit Máximo de resultados (default 20)
   */
  @Get('selector')
  async getSelector(
    @CurrentUser() user: any,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '20'), 50); // Max 50

    // ✅ MULTI-ASESOR: Filtrar por asesor si NO es admin
    const idAsesorFiltro = user?.esAdmin ? undefined : user?.idEmpleado;

    const items = await this.clientesService.findForSelector(q, limitNum, idAsesorFiltro);

    return {
      success: true,
      data: items,
    };
  }

  /**
   * ✅ MULTI-ASESOR: Filtra clientes por asesor asignado si el usuario no es admin
   * Admin/Gerente/Supervisor ve todos los clientes
   * Asesor solo ve sus clientes asignados
   */
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('tipo_cliente') tipo_cliente?: string,
    @Query('cliente_activo') cliente_activo?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    // Filtrar por asesor si NO es admin
    const idAsesorFiltro = user.esAdmin ? undefined : user.idEmpleado;

    const { items, total } = await this.clientesService.findAll({
      tipo_cliente,
      cliente_activo:
        cliente_activo !== undefined
          ? cliente_activo === 'true'
          : undefined,
      search,
      skip: skipNum,
      take: takeNum,
      idAsesorAsignado: idAsesorFiltro,
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
