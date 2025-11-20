import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ActividadesOrdenService } from './actividades-orden.service';
import { CreateActividadesOrdenDto } from './dto/create-actividades-orden.dto';
import { UpdateActividadesOrdenDto } from './dto/update-actividades-orden.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('actividades-orden')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActividadesOrdenController {
  constructor(private readonly actividadesOrdenService: ActividadesOrdenService) {}

  @Post()
  create(@Body() createDto: CreateActividadesOrdenDto) {
    return this.actividadesOrdenService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.actividadesOrdenService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.actividadesOrdenService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateActividadesOrdenDto,
  ) {
    return this.actividadesOrdenService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.actividadesOrdenService.remove(id);
  }
}
