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
import { CatalogoActividadesService } from './catalogo-actividades.service';
import { CreateCatalogoActividadesDto } from './dto/create-catalogo-actividades.dto';
import { UpdateCatalogoActividadesDto } from './dto/update-catalogo-actividades.dto';

@Controller('catalogo-actividades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogoActividadesController {
  constructor(private readonly catalogoActividadesService: CatalogoActividadesService) {}

  @Post()
  create(@Body() createDto: CreateCatalogoActividadesDto) {
    return this.catalogoActividadesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.catalogoActividadesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoActividadesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCatalogoActividadesDto,
  ) {
    return this.catalogoActividadesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoActividadesService.remove(id);
  }
}
