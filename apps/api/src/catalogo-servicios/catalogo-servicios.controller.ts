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
  create(@Body() createDto: CreateCatalogoServiciosDto) {
    return this.catalogoServiciosService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.catalogoServiciosService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoServiciosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCatalogoServiciosDto,
  ) {
    return this.catalogoServiciosService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catalogoServiciosService.remove(id);
  }
}
