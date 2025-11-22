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
import { AsignarRolDto } from './dto/asignar-rol.dto';
import { UsuariosRolesService } from './usuarios-roles.service';

@Controller('usuarios-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosRolesController {
  constructor(
    private readonly usuariosRolesService: UsuariosRolesService,
  ) {}

  @Post()
  asignar(
    @Body() asignarDto: AsignarRolDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.usuariosRolesService.asignarRol(asignarDto, userId);
  }

  @Get('usuario/:idUsuario')
  listarPorUsuario(@Param('idUsuario', ParseIntPipe) idUsuario: number) {
    return this.usuariosRolesService.listarRolesPorUsuario(idUsuario);
  }

  @Delete('usuario/:idUsuario/rol/:idRol')
  remover(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idRol', ParseIntPipe) idRol: number,
  ) {
    return this.usuariosRolesService.removerRol(idUsuario, idRol);
  }
}
