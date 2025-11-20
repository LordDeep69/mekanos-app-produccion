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
import { CreateHistorialEstadosEquipoDto } from './dto/create-historial-estados-equipo.dto';
import { UpdateHistorialEstadosEquipoDto } from './dto/update-historial-estados-equipo.dto';
import { HistorialEstadosEquipoService } from './historial-estados-equipo.service';

@Controller('historial-estados-equipo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistorialEstadosEquipoController {
  constructor(private readonly historialEstadosEquipoService: HistorialEstadosEquipoService) {}

  @Post()
  create(@Body() createDto: CreateHistorialEstadosEquipoDto) {
    return this.historialEstadosEquipoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.historialEstadosEquipoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.historialEstadosEquipoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateHistorialEstadosEquipoDto,
  ) {
    return this.historialEstadosEquipoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.historialEstadosEquipoService.remove(id);
  }
}
