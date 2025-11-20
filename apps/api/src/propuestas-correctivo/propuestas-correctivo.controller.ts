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
import { CreatePropuestasCorrectivoDto } from './dto/create-propuestas-correctivo.dto';
import { UpdatePropuestasCorrectivoDto } from './dto/update-propuestas-correctivo.dto';
import { PropuestasCorrectivoService } from './propuestas-correctivo.service';

@Controller('propuestas-correctivo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropuestasCorrectivoController {
  constructor(private readonly propuestasCorrectivoService: PropuestasCorrectivoService) {}

  @Post()
  create(@Body() createDto: CreatePropuestasCorrectivoDto) {
    return this.propuestasCorrectivoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.propuestasCorrectivoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propuestasCorrectivoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePropuestasCorrectivoDto,
  ) {
    return this.propuestasCorrectivoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propuestasCorrectivoService.remove(id);
  }
}
