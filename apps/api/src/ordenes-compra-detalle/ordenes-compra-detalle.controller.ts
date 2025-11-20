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
import { CreateOrdenesCompraDetalleDto } from './dto/create-ordenes-compra-detalle.dto';
import { UpdateOrdenesCompraDetalleDto } from './dto/update-ordenes-compra-detalle.dto';
import { OrdenesCompraDetalleService } from './ordenes-compra-detalle.service';

@Controller('ordenes-compra-detalle')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdenesCompraDetalleController {
  constructor(private readonly ordenesCompraDetalleService: OrdenesCompraDetalleService) {}

  @Post()
  create(@Body() createDto: CreateOrdenesCompraDetalleDto) {
    return this.ordenesCompraDetalleService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.ordenesCompraDetalleService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesCompraDetalleService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateOrdenesCompraDetalleDto,
  ) {
    return this.ordenesCompraDetalleService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordenesCompraDetalleService.remove(id);
  }
}
