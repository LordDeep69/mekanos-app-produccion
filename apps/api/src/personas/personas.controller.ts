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
import { CreatePersonasDto } from './dto/create-personas.dto';
import { UpdatePersonasDto } from './dto/update-personas.dto';
import { PersonasService } from './personas.service';

@Controller('personas')
// @Public() // REMOVIDO - Se requiere JWT para creado_por y modificado_por
@UseGuards(JwtAuthGuard, RolesGuard)
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Post()
  create(
    @Body() createDto: CreatePersonasDto,
    @CurrentUser() user: any,
  ) {
    return this.personasService.create(createDto, user.id);
  }

  @Get()
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.personasService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.personasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePersonasDto,
    @CurrentUser() user: any,
  ) {
    return this.personasService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.personasService.remove(id);
  }
}
