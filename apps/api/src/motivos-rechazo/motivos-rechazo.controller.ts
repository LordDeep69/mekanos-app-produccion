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
import { CreateMotivosRechazoDto } from './dto/create-motivos-rechazo.dto';
import { UpdateMotivosRechazoDto } from './dto/update-motivos-rechazo.dto';
import { MotivosRechazoService } from './motivos-rechazo.service';

@Controller('motivos-rechazo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MotivosRechazoController {
  constructor(private readonly motivosRechazoService: MotivosRechazoService) {}

  @Post()
  create(@Body() createDto: CreateMotivosRechazoDto) {
    return this.motivosRechazoService.create(createDto);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.motivosRechazoService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.motivosRechazoService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateMotivosRechazoDto,
  ) {
    return this.motivosRechazoService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.motivosRechazoService.remove(id);
  }
}
