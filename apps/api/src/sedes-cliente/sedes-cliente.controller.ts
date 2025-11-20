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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  create(
    @Body() createDto: CreateSedesClienteDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.sedesClienteService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('id_cliente') id_cliente?: string,
    @Query('activo') activo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.sedesClienteService.findAll({
      id_cliente: id_cliente ? parseInt(id_cliente) : undefined,
      activo: activo !== undefined ? activo === 'true' : undefined,
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sedesClienteService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSedesClienteDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.sedesClienteService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sedesClienteService.remove(id);
  }
}
