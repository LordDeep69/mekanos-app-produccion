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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CatalogoServiciosService } from './catalogo-servicios.service';
import { CreateCatalogoServiciosDto } from './dto/create-catalogo-servicios.dto';
import { UpdateCatalogoServiciosDto } from './dto/update-catalogo-servicios.dto';

@Controller('catalogo-servicios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogoServiciosController {
  constructor(private readonly catalogoServiciosService: CatalogoServiciosService) {}

  @Post()
  async create(@Body() createDto: CreateCatalogoServiciosDto) {
    const result = await this.catalogoServiciosService.create(createDto);
    return {
      success: true,
      message: 'Servicio comercial creado exitosamente',
      data: result,
    };
  }

  @Get()
  async findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('categoria') categoria?: string,
    @Query('idTipoEquipo') idTipoEquipoStr?: string,
    @Query('idTipoServicio') idTipoServicioStr?: string,
    @Query('activo') activoStr?: string,
    @Query('search') search?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const idTipoEquipo = idTipoEquipoStr ? parseInt(idTipoEquipoStr, 10) : undefined;
    const idTipoServicio = idTipoServicioStr ? parseInt(idTipoServicioStr, 10) : undefined;
    const activo = activoStr !== undefined ? activoStr === 'true' : undefined;

    const result = await this.catalogoServiciosService.findAll(
      page,
      limit,
      categoria,
      idTipoEquipo,
      idTipoServicio,
      activo,
      search,
    );

    return {
      success: true,
      message: 'Catálogo de servicios obtenido exitosamente',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.catalogoServiciosService.findOne(id);
    return {
      success: true,
      message: 'Servicio comercial obtenido exitosamente',
      data: result,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCatalogoServiciosDto,
  ) {
    const result = await this.catalogoServiciosService.update(id, updateDto);
    return {
      success: true,
      message: 'Servicio comercial actualizado exitosamente',
      data: result,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const result = await this.catalogoServiciosService.remove(id);
    return {
      success: true,
      message: 'Servicio comercial desactivado exitosamente',
      data: result,
    };
  }
}
