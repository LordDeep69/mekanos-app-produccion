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
import { ArchivosEquipoService } from './archivos-equipo.service';
import { CreateArchivosEquipoDto } from './dto/create-archivos-equipo.dto';
import { UpdateArchivosEquipoDto } from './dto/update-archivos-equipo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('archivos-equipo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ArchivosEquipoController {
  constructor(private readonly archivosEquipoService: ArchivosEquipoService) {}

  @Post()
  create(@Body() createDto: CreateArchivosEquipoDto) {
    return this.archivosEquipoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    return this.archivosEquipoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.archivosEquipoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateArchivosEquipoDto,
  ) {
    return this.archivosEquipoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.archivosEquipoService.remove(id);
  }
}
