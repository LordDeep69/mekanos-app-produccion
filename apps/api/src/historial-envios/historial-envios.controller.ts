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
import { CreateHistorialEnviosDto } from './dto/create-historial-envios.dto';
import { UpdateHistorialEnviosDto } from './dto/update-historial-envios.dto';
import { HistorialEnviosService } from './historial-envios.service';

@Controller('historial-envios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistorialEnviosController {
  constructor(private readonly historialEnviosService: HistorialEnviosService) {}

  @Post()
  create(@Body() createDto: CreateHistorialEnviosDto) {
    return this.historialEnviosService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.historialEnviosService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.historialEnviosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateHistorialEnviosDto,
  ) {
    return this.historialEnviosService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.historialEnviosService.remove(id);
  }
}
