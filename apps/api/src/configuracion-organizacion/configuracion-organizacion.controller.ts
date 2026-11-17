import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permisos } from '../auth/decorators/permisos.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ConfiguracionOrganizacionService } from './configuracion-organizacion.service';
import { UpdateConfiguracionOrganizacionDto } from './dto/update-configuracion-organizacion.dto';

@ApiTags('Configuración White-Label')
@Controller('configuracion')
export class ConfiguracionOrganizacionController {
  constructor(private readonly configOrgService: ConfiguracionOrganizacionService) {}

  @Public()
  @Get('publica')
  @ApiOperation({
    summary: 'Obtener branding y parametrización regional pública (sin credenciales)',
  })
  @ApiResponse({ status: 200, description: 'Configuración pública de la organización' })
  getPublica() {
    return this.configOrgService.getPublica();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('categorias-activo')
  @ApiOperation({ summary: 'Listar categorías configurables de activos' })
  getCategoriasActivo() {
    return this.configOrgService.getCategoriasActivo();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @Get('empresa')
  @ApiOperation({ summary: 'Obtener configuración completa de la organización' })
  @ApiResponse({ status: 200, description: 'Configuración completa de la empresa' })
  getEmpresa() {
    return this.configOrgService.getEmpresa();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @Put('empresa')
  @ApiOperation({ summary: 'Actualizar configuración corporativa y white-label' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada correctamente' })
  updateEmpresa(
    @Body() dto: UpdateConfiguracionOrganizacionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.configOrgService.updateEmpresa(dto, userId);
  }
}
