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
import { CreateHistorialContratoDto } from './dto/create-historial-contrato.dto';
import { UpdateHistorialContratoDto } from './dto/update-historial-contrato.dto';
import { HistorialContratoService } from './historial-contrato.service';

@Controller('historial-contrato')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistorialContratoController {
  constructor(private readonly historialContratoService: HistorialContratoService) {}

  @Post()
  create(@Body() createDto: CreateHistorialContratoDto) {
    return this.historialContratoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.historialContratoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.historialContratoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateHistorialContratoDto,
  ) {
    return this.historialContratoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.historialContratoService.remove(id);
  }
}
