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
import { CreateEstadosOrdenDto } from './dto/create-estados-orden.dto';
import { UpdateEstadosOrdenDto } from './dto/update-estados-orden.dto';
import { EstadosOrdenService } from './estados-orden.service';

@Controller('estados-orden')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstadosOrdenController {
  constructor(private readonly estadosOrdenService: EstadosOrdenService) {}

  @Post()
  create(@Body() createDto: CreateEstadosOrdenDto) {
    return this.estadosOrdenService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.estadosOrdenService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.estadosOrdenService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEstadosOrdenDto,
  ) {
    return this.estadosOrdenService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.estadosOrdenService.remove(id);
  }
}
