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
import { BitacorasInformesService } from './bitacoras-informes.service';
import { CreateBitacorasInformesDto } from './dto/create-bitacoras-informes.dto';
import { UpdateBitacorasInformesDto } from './dto/update-bitacoras-informes.dto';

@Controller('bitacoras-informes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BitacorasInformesController {
  constructor(private readonly bitacorasInformesService: BitacorasInformesService) {}

  @Post()
  create(@Body() createDto: CreateBitacorasInformesDto) {
    return this.bitacorasInformesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.bitacorasInformesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bitacorasInformesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateBitacorasInformesDto,
  ) {
    return this.bitacorasInformesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bitacorasInformesService.remove(id);
  }
}
