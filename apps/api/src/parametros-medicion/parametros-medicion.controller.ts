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
import { CreateParametrosMedicionDto } from './dto/create-parametros-medicion.dto';
import { UpdateParametrosMedicionDto } from './dto/update-parametros-medicion.dto';
import { ParametrosMedicionService } from './parametros-medicion.service';

@Controller('parametros-medicion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrosMedicionController {
  constructor(private readonly parametrosMedicionService: ParametrosMedicionService) {}

  @Post()
  create(@Body() createDto: CreateParametrosMedicionDto) {
    return this.parametrosMedicionService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.parametrosMedicionService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parametrosMedicionService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateParametrosMedicionDto,
  ) {
    return this.parametrosMedicionService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parametrosMedicionService.remove(id);
  }
}
