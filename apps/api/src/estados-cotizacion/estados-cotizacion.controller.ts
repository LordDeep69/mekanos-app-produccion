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
import { CreateEstadosCotizacionDto } from './dto/create-estados-cotizacion.dto';
import { UpdateEstadosCotizacionDto } from './dto/update-estados-cotizacion.dto';
import { EstadosCotizacionService } from './estados-cotizacion.service';

@Controller('estados-cotizacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosCotizacionController {
  constructor(private readonly estadosCotizacionService: EstadosCotizacionService) {}

  @Post()
  create(@Body() createDto: CreateEstadosCotizacionDto) {
    return this.estadosCotizacionService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.estadosCotizacionService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.estadosCotizacionService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEstadosCotizacionDto,
  ) {
    return this.estadosCotizacionService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.estadosCotizacionService.remove(id);
  }
}
