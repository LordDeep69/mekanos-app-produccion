import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AsignarPermisoDto } from './dto/asignar-permiso.dto';
import { RolesPermisosService } from './roles-permisos.service';

@Controller('roles-permisos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesPermisosController {
  constructor(
    private readonly rolesPermisosService: RolesPermisosService,
  ) {}

  @Post()
  asignar(
    @Body() asignarDto: AsignarPermisoDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.rolesPermisosService.asignarPermiso(asignarDto, userId);
  }

  @Get('rol/:idRol')
  listarPorRol(@Param('idRol', ParseIntPipe) idRol: number) {
    return this.rolesPermisosService.listarPermisosPorRol(idRol);
  }

  @Delete('rol/:idRol/permiso/:idPermiso')
  remover(
    @Param('idRol', ParseIntPipe) idRol: number,
    @Param('idPermiso', ParseIntPipe) idPermiso: number,
  ) {
    return this.rolesPermisosService.removerPermiso(idRol, idPermiso);
  }
}
