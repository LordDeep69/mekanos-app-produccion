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
import { ContratosMantenimientoService } from './contratos-mantenimiento.service';
import { CreateContratosMantenimientoDto } from './dto/create-contratos-mantenimiento.dto';
import { UpdateContratosMantenimientoDto } from './dto/update-contratos-mantenimiento.dto';

@Controller('contratos-mantenimiento')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContratosMantenimientoController {
  constructor(private readonly contratosMantenimientoService: ContratosMantenimientoService) {}

  @Post()
  create(@Body() createDto: CreateContratosMantenimientoDto) {
    return this.contratosMantenimientoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.contratosMantenimientoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contratosMantenimientoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateContratosMantenimientoDto,
  ) {
    return this.contratosMantenimientoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contratosMantenimientoService.remove(id);
  }
}
