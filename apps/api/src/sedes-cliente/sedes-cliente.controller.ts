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
import { CreateSedesClienteDto } from './dto/create-sedes-cliente.dto';
import { UpdateSedesClienteDto } from './dto/update-sedes-cliente.dto';
import { SedesClienteService } from './sedes-cliente.service';

@Controller('sedes-cliente')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SedesClienteController {
  constructor(private readonly sedesClienteService: SedesClienteService) {}

  @Post()
  create(@Body() createDto: CreateSedesClienteDto) {
    return this.sedesClienteService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.sedesClienteService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sedesClienteService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSedesClienteDto,
  ) {
    return this.sedesClienteService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sedesClienteService.remove(id);
  }
}
