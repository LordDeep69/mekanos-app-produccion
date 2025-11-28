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
import { CreatePermisosDto } from './dto/create-permisos.dto';
import { UpdatePermisosDto } from './dto/update-permisos.dto';
import { PermisosService } from './permisos.service';

@Controller('permisos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Post()
  create(
    @Body() createDto: CreatePermisosDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.permisosService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('modulo') modulo?: string,
    @Query('activo') activo?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.permisosService.findAll({
      modulo,
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permisosService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePermisosDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.permisosService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permisosService.remove(id);
  }
}
