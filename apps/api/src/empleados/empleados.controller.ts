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
import { CreateEmpleadosDto } from './dto/create-empleados.dto';
import { UpdateEmpleadosDto } from './dto/update-empleados.dto';
import { EmpleadosService } from './empleados.service';

@Controller('empleados')
@UseGuards(JwtAuthGuard)
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) { }

  /**
   * ✅ MULTI-ASESOR: Endpoint ligero para selector de asesores
   * Retorna solo id, nombre - ideal para dropdowns
   */
  @Get('selector/asesores')
  async getAsesoresSelector() {
    const asesores = await this.empleadosService.findAsesoresForSelector();
    return {
      success: true,
      data: asesores,
    };
  }

  @Post()
  create(
    @Body() createDto: CreateEmpleadosDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.empleadosService.create(createDto, userId);
  }

  @Get()
  async findAll(
    @Query('es_tecnico') es_tecnico?: string,
    @Query('es_asesor') es_asesor?: string,
    @Query('empleado_activo') empleado_activo?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip) : 0;
    const takeNum = take ? parseInt(take) : 50;

    const { items, total } = await this.empleadosService.findAll({
      es_tecnico: es_tecnico !== undefined ? es_tecnico === 'true' : undefined,
      es_asesor: es_asesor !== undefined ? es_asesor === 'true' : undefined,
      empleado_activo:
        empleado_activo !== undefined ? empleado_activo === 'true' : undefined,
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
    return this.empleadosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEmpleadosDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.empleadosService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.empleadosService.remove(id);
  }
}
