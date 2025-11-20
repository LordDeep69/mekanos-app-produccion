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
import { CreateRemisionesDetalleDto } from './dto/create-remisiones-detalle.dto';
import { UpdateRemisionesDetalleDto } from './dto/update-remisiones-detalle.dto';
import { RemisionesDetalleService } from './remisiones-detalle.service';

@Controller('remisiones-detalle')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemisionesDetalleController {
  constructor(private readonly remisionesDetalleService: RemisionesDetalleService) {}

  @Post()
  create(@Body() createDto: CreateRemisionesDetalleDto) {
    return this.remisionesDetalleService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.remisionesDetalleService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.remisionesDetalleService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRemisionesDetalleDto,
  ) {
    return this.remisionesDetalleService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.remisionesDetalleService.remove(id);
  }
}
