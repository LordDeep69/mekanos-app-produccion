import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BitacorasInformesService } from './bitacoras-informes.service';
import { CreateBitacorasInformesDto } from './dto/create-bitacoras-informes.dto';
import { UpdateBitacorasInformesDto } from './dto/update-bitacoras-informes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
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
