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
import { CreateEquiposContratoDto } from './dto/create-equipos-contrato.dto';
import { UpdateEquiposContratoDto } from './dto/update-equipos-contrato.dto';
import { EquiposContratoService } from './equipos-contrato.service';

@Controller('equipos-contrato')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposContratoController {
  constructor(private readonly equiposContratoService: EquiposContratoService) {}

  @Post()
  create(@Body() createDto: CreateEquiposContratoDto) {
    return this.equiposContratoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.equiposContratoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equiposContratoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEquiposContratoDto,
  ) {
    return this.equiposContratoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.equiposContratoService.remove(id);
  }
}
