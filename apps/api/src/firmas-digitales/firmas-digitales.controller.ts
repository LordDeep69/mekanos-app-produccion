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
import { CreateFirmasDigitalesDto } from './dto/create-firmas-digitales.dto';
import { UpdateFirmasDigitalesDto } from './dto/update-firmas-digitales.dto';
import { FirmasDigitalesService } from './firmas-digitales.service';

@Controller('firmas-digitales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FirmasDigitalesController {
  constructor(private readonly firmasDigitalesService: FirmasDigitalesService) {}

  @Post()
  create(@Body() createDto: CreateFirmasDigitalesDto) {
    return this.firmasDigitalesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.firmasDigitalesService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.firmasDigitalesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateFirmasDigitalesDto,
  ) {
    return this.firmasDigitalesService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.firmasDigitalesService.remove(id);
  }
}
