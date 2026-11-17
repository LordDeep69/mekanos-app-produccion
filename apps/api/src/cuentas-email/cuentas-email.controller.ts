import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permisos } from '../auth/decorators/permisos.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermisosGuard } from '../auth/guards/permisos.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CuentasEmailService } from './cuentas-email.service';
import { CreateCuentaEmailDto, UpdateCuentaEmailDto } from './dto';

@ApiTags('Cuentas Email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('cuentas-email')
export class CuentasEmailController {
  constructor(private readonly cuentasEmailService: CuentasEmailService) {}

  @Post()
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Crear una nueva cuenta de email' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Credenciales inválidas' })
  create(@Body() createDto: CreateCuentaEmailDto, @CurrentUser('id') userId: number) {
    return this.cuentasEmailService.create(createDto, userId);
  }

  @Get()
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Listar todas las cuentas de email' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas de email' })
  findAll() {
    return this.cuentasEmailService.findAll();
  }

  @Get('selector')
  @ApiOperation({ summary: 'Obtener cuentas para selector (sin credenciales)' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas para selector' })
  findAllForSelector() {
    return this.cuentasEmailService.findAllForSelector();
  }

  @Get('principal')
  @ApiOperation({ summary: 'Obtener la cuenta principal' })
  @ApiResponse({ status: 200, description: 'Cuenta principal' })
  findPrincipal() {
    return this.cuentasEmailService.findPrincipal();
  }

  @Get(':id')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Obtener una cuenta de email por ID' })
  @ApiResponse({ status: 200, description: 'Cuenta de email encontrada' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasEmailService.findOne(id);
  }

  @Post(':id/test')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Probar conexión de una cuenta de email' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba de conexión' })
  testConexion(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasEmailService.testEnvio(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Actualizar una cuenta de email' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCuentaEmailDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.cuentasEmailService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permisos('CONFIG_SYSTEM')
  @ApiOperation({ summary: 'Eliminar una cuenta de email' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar, hay clientes usando esta cuenta' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasEmailService.remove(id);
  }
}
