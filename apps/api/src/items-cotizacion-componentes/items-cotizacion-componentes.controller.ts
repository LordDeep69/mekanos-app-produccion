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
import { CreateItemsCotizacionComponentesDto } from './dto/create-items-cotizacion-componentes.dto';
import { UpdateItemsCotizacionComponentesDto } from './dto/update-items-cotizacion-componentes.dto';
import { ItemsCotizacionComponentesService } from './items-cotizacion-componentes.service';

@Controller('items-cotizacion-componentes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsCotizacionComponentesController {
  constructor(private readonly itemsCotizacionComponentesService: ItemsCotizacionComponentesService) {}

  @Post()
  create(@Body() createDto: CreateItemsCotizacionComponentesDto) {
    return this.itemsCotizacionComponentesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.itemsCotizacionComponentesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsCotizacionComponentesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateItemsCotizacionComponentesDto,
  ) {
    return this.itemsCotizacionComponentesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsCotizacionComponentesService.remove(id);
  }
}
