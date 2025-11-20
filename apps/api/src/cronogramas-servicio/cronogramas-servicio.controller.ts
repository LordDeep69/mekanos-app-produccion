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
import { CronogramasServicioService } from './cronogramas-servicio.service';
import { CreateCronogramasServicioDto } from './dto/create-cronogramas-servicio.dto';
import { UpdateCronogramasServicioDto } from './dto/update-cronogramas-servicio.dto';

@Controller('cronogramas-servicio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CronogramasServicioController {
  constructor(private readonly cronogramasServicioService: CronogramasServicioService) {}

  @Post()
  create(@Body() createDto: CreateCronogramasServicioDto) {
    return this.cronogramasServicioService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.cronogramasServicioService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cronogramasServicioService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCronogramasServicioDto,
  ) {
    return this.cronogramasServicioService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cronogramasServicioService.remove(id);
  }
}
