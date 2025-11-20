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
import { CreatePlantillasInformeDto } from './dto/create-plantillas-informe.dto';
import { UpdatePlantillasInformeDto } from './dto/update-plantillas-informe.dto';
import { PlantillasInformeService } from './plantillas-informe.service';

@Controller('plantillas-informe')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlantillasInformeController {
  constructor(private readonly plantillasInformeService: PlantillasInformeService) {}

  @Post()
  create(@Body() createDto: CreatePlantillasInformeDto) {
    return this.plantillasInformeService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.plantillasInformeService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.plantillasInformeService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePlantillasInformeDto,
  ) {
    return this.plantillasInformeService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.plantillasInformeService.remove(id);
  }
}
