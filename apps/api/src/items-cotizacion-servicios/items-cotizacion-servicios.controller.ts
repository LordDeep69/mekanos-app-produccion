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
import { CreateItemsCotizacionServiciosDto } from './dto/create-items-cotizacion-servicios.dto';
import { UpdateItemsCotizacionServiciosDto } from './dto/update-items-cotizacion-servicios.dto';
import { ItemsCotizacionServiciosService } from './items-cotizacion-servicios.service';

@Controller('items-cotizacion-servicios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsCotizacionServiciosController {
  constructor(private readonly itemsCotizacionServiciosService: ItemsCotizacionServiciosService) {}

  @Post()
  create(@Body() createDto: CreateItemsCotizacionServiciosDto) {
    return this.itemsCotizacionServiciosService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.itemsCotizacionServiciosService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsCotizacionServiciosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateItemsCotizacionServiciosDto,
  ) {
    return this.itemsCotizacionServiciosService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsCotizacionServiciosService.remove(id);
  }
}
