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
import { CreateEvidenciasOrdenDto } from './dto/create-evidencias-orden.dto';
import { UpdateEvidenciasOrdenDto } from './dto/update-evidencias-orden.dto';
import { EvidenciasOrdenService } from './evidencias-orden.service';

@Controller('evidencias-orden')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenciasOrdenController {
  constructor(private readonly evidenciasOrdenService: EvidenciasOrdenService) {}

  @Post()
  create(@Body() createDto: CreateEvidenciasOrdenDto) {
    return this.evidenciasOrdenService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.evidenciasOrdenService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evidenciasOrdenService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEvidenciasOrdenDto,
  ) {
    return this.evidenciasOrdenService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.evidenciasOrdenService.remove(id);
  }
}
