import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { CrearProveedorDto } from './dto/create-proveedor.dto';
import { ActualizarArticuloProveedorDto, HomologarArticuloProveedorDto } from './dto/homologar-articulo.dto';
import { UpdateProveedoresDto } from './dto/update-proveedores.dto';
import { ProveedoresService } from './proveedores.service';

@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  create(
    @Body() createDto: CrearProveedorDto,
    @UserId() userId: number,
  ) {
    return this.proveedoresService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.proveedoresService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.findOne(id);
  }

  @Get(':id/ficha')
  getFicha360(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.getFicha360(id);
  }

  @Get(':id/articulos')
  getArticulos(
    @Param('id', ParseIntPipe) id: number,
    @Query('search') search?: string,
  ) {
    return this.proveedoresService.getArticulosProveedor(id, search);
  }

  @Post(':id/articulos')
  homologarArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HomologarArticuloProveedorDto,
    @UserId() userId: number,
  ) {
    return this.proveedoresService.homologarArticulo(id, dto, userId);
  }

  @Put(':id/articulos/:idComponente')
  actualizarArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('idComponente', ParseIntPipe) idComponente: number,
    @Body() dto: ActualizarArticuloProveedorDto,
    @UserId() userId: number,
  ) {
    return this.proveedoresService.actualizarArticuloHomologado(
      id,
      idComponente,
      dto,
      userId,
    );
  }

  @Delete(':id/articulos/:idComponente')
  desvincularArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('idComponente', ParseIntPipe) idComponente: number,
  ) {
    return this.proveedoresService.desvincularArticulo(id, idComponente);
  }

  @Get(':id/ordenes')
  getOrdenes(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.getOrdenesProveedor(id);
  }

  @Put(':id')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProveedoresDto,
  ) {
    return this.proveedoresService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.proveedoresService.remove(id);
  }
}

