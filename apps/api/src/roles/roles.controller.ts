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
import { CreateRolesDto } from './dto/create-roles.dto';
import { UpdateRolesDto } from './dto/update-roles.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(
    @Body() createDto: CreateRolesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.rolesService.create(createDto, userId);
  }

  @Get()
  findAll(
    @Query('activo') activo?: string,
    @Query('es_rol_sistema') esRolSistema?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.rolesService.findAll({
      activo: activo === 'true' ? true : activo === 'false' ? false : undefined,
      es_rol_sistema:
        esRolSistema === 'true'
          ? true
          : esRolSistema === 'false'
            ? false
            : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateRolesDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.rolesService.update(id, updateDto, userId);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }
}
