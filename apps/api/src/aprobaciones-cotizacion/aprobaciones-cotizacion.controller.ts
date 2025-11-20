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
import { AprobacionesCotizacionService } from './aprobaciones-cotizacion.service';
import { CreateAprobacionesCotizacionDto } from './dto/create-aprobaciones-cotizacion.dto';
import { UpdateAprobacionesCotizacionDto } from './dto/update-aprobaciones-cotizacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('aprobaciones-cotizacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AprobacionesCotizacionController {
  constructor(private readonly aprobacionesCotizacionService: AprobacionesCotizacionService) {}

  @Post()
  create(@Body() createDto: CreateAprobacionesCotizacionDto) {
    return this.aprobacionesCotizacionService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.aprobacionesCotizacionService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.aprobacionesCotizacionService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAprobacionesCotizacionDto,
  ) {
    return this.aprobacionesCotizacionService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.aprobacionesCotizacionService.remove(id);
  }
}
