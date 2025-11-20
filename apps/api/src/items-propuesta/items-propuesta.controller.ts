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
import { CreateItemsPropuestaDto } from './dto/create-items-propuesta.dto';
import { UpdateItemsPropuestaDto } from './dto/update-items-propuesta.dto';
import { ItemsPropuestaService } from './items-propuesta.service';

@Controller('items-propuesta')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsPropuestaController {
  constructor(private readonly itemsPropuestaService: ItemsPropuestaService) {}

  @Post()
  create(@Body() createDto: CreateItemsPropuestaDto) {
    return this.itemsPropuestaService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.itemsPropuestaService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsPropuestaService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateItemsPropuestaDto,
  ) {
    return this.itemsPropuestaService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsPropuestaService.remove(id);
  }
}
