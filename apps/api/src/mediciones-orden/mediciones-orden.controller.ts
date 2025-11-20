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
import { CreateMedicionesOrdenDto } from './dto/create-mediciones-orden.dto';
import { UpdateMedicionesOrdenDto } from './dto/update-mediciones-orden.dto';
import { MedicionesOrdenService } from './mediciones-orden.service';

@Controller('mediciones-orden')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicionesOrdenController {
  constructor(private readonly medicionesOrdenService: MedicionesOrdenService) {}

  @Post()
  create(@Body() createDto: CreateMedicionesOrdenDto) {
    return this.medicionesOrdenService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.medicionesOrdenService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.medicionesOrdenService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMedicionesOrdenDto,
  ) {
    return this.medicionesOrdenService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.medicionesOrdenService.remove(id);
  }
}
