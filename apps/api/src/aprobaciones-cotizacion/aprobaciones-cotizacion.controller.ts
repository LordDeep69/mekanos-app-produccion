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
import { AprobacionesCotizacionService } from './aprobaciones-cotizacion.service';
import { CreateAprobacionesCotizacionDto } from './dto/create-aprobaciones-cotizacion.dto';
import { UpdateAprobacionesCotizacionDto } from './dto/update-aprobaciones-cotizacion.dto';

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.aprobacionesCotizacionService.findAll(pageNum, limitNum);
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
