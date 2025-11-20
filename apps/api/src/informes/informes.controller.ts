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
import { CreateInformesDto } from './dto/create-informes.dto';
import { UpdateInformesDto } from './dto/update-informes.dto';
import { InformesService } from './informes.service';

@Controller('informes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Post()
  create(@Body() createDto: CreateInformesDto) {
    return this.informesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.informesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.informesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateInformesDto,
  ) {
    return this.informesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.informesService.remove(id);
  }
}
