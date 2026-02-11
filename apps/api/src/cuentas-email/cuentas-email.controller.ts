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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CuentasEmailService } from './cuentas-email.service';
import { CreateCuentaEmailDto, UpdateCuentaEmailDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cuentas Email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cuentas-email')
export class CuentasEmailController {
  constructor(private readonly cuentasEmailService: CuentasEmailService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva cuenta de email' })
  @ApiResponse({ status: 201, description: 'Cuenta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Credenciales inválidas' })
  create(@Body() createDto: CreateCuentaEmailDto, @Req() req: any) {
    const userId = req.user?.id_usuario || req.user?.sub || 1;
    return this.cuentasEmailService.create(createDto, userId);
  }

  @Get()
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
  @ApiOperation({ summary: 'Obtener una cuenta de email por ID' })
  @ApiResponse({ status: 200, description: 'Cuenta de email encontrada' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasEmailService.findOne(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Probar conexión de una cuenta de email' })
  @ApiResponse({ status: 200, description: 'Resultado de la prueba de conexión' })
  testConexion(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasEmailService.testEnvio(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una cuenta de email' })
  @ApiResponse({ status: 200, description: 'Cuenta actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCuentaEmailDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id_usuario || req.user?.sub || 1;
    return this.cuentasEmailService.update(id, updateDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una cuenta de email' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar, hay clientes usando esta cuenta' })
  @ApiResponse({ status: 404, description: 'Cuenta no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cuentasEmailService.remove(id);
  }
}
