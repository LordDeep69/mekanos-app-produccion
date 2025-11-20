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
import { CreateLecturasHorometroDto } from './dto/create-lecturas-horometro.dto';
import { UpdateLecturasHorometroDto } from './dto/update-lecturas-horometro.dto';
import { LecturasHorometroService } from './lecturas-horometro.service';

@Controller('lecturas-horometro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LecturasHorometroController {
  constructor(private readonly lecturasHorometroService: LecturasHorometroService) {}

  @Post()
  create(@Body() createDto: CreateLecturasHorometroDto) {
    return this.lecturasHorometroService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.lecturasHorometroService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lecturasHorometroService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLecturasHorometroDto,
  ) {
    return this.lecturasHorometroService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lecturasHorometroService.remove(id);
  }
}
