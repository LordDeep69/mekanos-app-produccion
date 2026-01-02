// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO CONTROLLER - API REST ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════════

import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import {
    AjusteInventarioDto,
    EntradaInventarioDto,
    InventarioService,
    SalidaInventarioDto
} from './inventario.service';

@ApiTags('Inventario')
@Controller('inventario')
@Public() // TODO: Quitar en producción y agregar guards apropiados
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // DASHBOARD Y CONSULTAS
    // ─────────────────────────────────────────────────────────────────────────────

    @Get('dashboard')
    @ApiOperation({ summary: 'Obtener KPIs del dashboard de inventario' })
    @ApiResponse({ status: 200, description: 'KPIs obtenidos exitosamente' })
    async getDashboard() {
        return this.inventarioService.getDashboardKPIs();
    }

    @Get('componentes')
    @ApiOperation({ summary: 'Listar componentes con stock' })
    @ApiQuery({ name: 'busqueda', required: false })
    @ApiQuery({ name: 'id_tipo', required: false })
    @ApiQuery({ name: 'solo_criticos', required: false })
    @ApiQuery({ name: 'skip', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async listarComponentes(
        @Query('busqueda') busqueda?: string,
        @Query('id_tipo') idTipo?: string,
        @Query('solo_criticos') soloCriticos?: string,
        @Query('skip') skip?: string,
        @Query('limit') limit?: string,
    ) {
        return this.inventarioService.listarComponentesConStock({
            busqueda,
            id_tipo: idTipo ? parseInt(idTipo, 10) : undefined,
            solo_criticos: soloCriticos === 'true',
            skip: skip ? parseInt(skip, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('kardex/:idComponente')
    @ApiOperation({ summary: 'Obtener kardex (historial) de un componente' })
    @ApiResponse({ status: 200, description: 'Kardex obtenido exitosamente' })
    @ApiResponse({ status: 404, description: 'Componente no encontrado' })
    async getKardex(
        @Param('idComponente', ParseIntPipe) idComponente: number,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.inventarioService.getKardex(idComponente, {
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    @Get('alertas')
    @ApiOperation({ summary: 'Obtener alertas de stock' })
    @ApiQuery({ name: 'estado', required: false })
    async getAlertas(@Query('estado') estado?: string) {
        return this.inventarioService.getAlertasStock(estado);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // OPERACIONES DE MOVIMIENTO
    // ─────────────────────────────────────────────────────────────────────────────

    @Post('entrada')
    @ApiOperation({ summary: 'Registrar entrada de inventario (compra/devolución)' })
    @ApiResponse({ status: 201, description: 'Entrada registrada exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 404, description: 'Componente no encontrado' })
    async registrarEntrada(@Body() dto: EntradaInventarioDto) {
        return this.inventarioService.registrarEntrada(dto);
    }

    @Post('salida')
    @ApiOperation({ summary: 'Registrar salida de inventario (consumo/despacho)' })
    @ApiResponse({ status: 201, description: 'Salida registrada exitosamente' })
    @ApiResponse({ status: 400, description: 'Stock insuficiente o datos inválidos' })
    @ApiResponse({ status: 404, description: 'Componente no encontrado' })
    async registrarSalida(@Body() dto: SalidaInventarioDto) {
        return this.inventarioService.registrarSalida(dto);
    }

    @Post('ajuste')
    @ApiOperation({ summary: 'Registrar ajuste de inventario (conteo físico/merma)' })
    @ApiResponse({ status: 201, description: 'Ajuste registrado exitosamente' })
    @ApiResponse({ status: 400, description: 'Datos inválidos' })
    @ApiResponse({ status: 404, description: 'Componente no encontrado' })
    async registrarAjuste(@Body() dto: AjusteInventarioDto) {
        return this.inventarioService.registrarAjuste(dto);
    }

    @Put('alertas/:id/resolver')
    @ApiOperation({ summary: 'Resolver una alerta de stock' })
    async resolverAlerta(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { usuario_id: number; observaciones?: string },
    ) {
        return this.inventarioService.resolverAlerta(
            id,
            body.usuario_id,
            body.observaciones,
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VISTA MAESTRA Y CRUD DE COMPONENTE
    // ─────────────────────────────────────────────────────────────────────────────

    @Get('componente/:id')
    @ApiOperation({ summary: 'Obtener detalle completo de un componente (Vista Maestra)' })
    @ApiResponse({ status: 200, description: 'Detalle del componente obtenido' })
    @ApiResponse({ status: 404, description: 'Componente no encontrado' })
    async getDetalleComponente(@Param('id', ParseIntPipe) id: number) {
        return this.inventarioService.getDetalleComponente(id);
    }

    @Put('componente/:id')
    @ApiOperation({ summary: 'Actualizar campos maestros de un componente' })
    @ApiResponse({ status: 200, description: 'Componente actualizado exitosamente' })
    @ApiResponse({ status: 404, description: 'Componente no encontrado' })
    async actualizarComponente(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ActualizarComponenteDto,
    ) {
        return this.inventarioService.actualizarComponente(id, dto);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CATÁLOGOS AUXILIARES (PARA SELECTORES)
    // ─────────────────────────────────────────────────────────────────────────────

    @Get('tipos-componente')
    @ApiOperation({ summary: 'Obtener tipos de componente para selectores' })
    async getTiposComponente() {
        return this.inventarioService.getTiposComponente();
    }

    @Get('proveedores')
    @ApiOperation({ summary: 'Obtener proveedores para selectores' })
    async getProveedores() {
        return this.inventarioService.getProveedores();
    }
}
