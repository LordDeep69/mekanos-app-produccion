// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO CONTROLLER - API REST ENTERPRISE (WMS / KARDEX / MULTI-BODEGA)
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
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
    ActualizarComponenteDto,
    AjusteInventarioDto,
    CrearBodegaDto,
    EntradaInventarioDto,
    InventarioService,
    SalidaInventarioDto,
    TrasladoInventarioDto,
} from './inventario.service';

@ApiTags('Inventario')
@Controller('inventario')
@UseGuards(JwtAuthGuard)
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) { }

    // ─────────────────────────────────────────────────────────────────────────────
    // DASHBOARD Y CONSULTAS PRINCIPALES
    // ─────────────────────────────────────────────────────────────────────────────

    @Get('dashboard')
    @ApiOperation({ summary: 'Obtener KPIs del dashboard de inventario' })
    @ApiResponse({ status: 200, description: 'KPIs obtenidos exitosamente' })
    async getDashboard() {
        return this.inventarioService.getDashboardKPIs();
    }

    @Get('componentes')
    @ApiOperation({ summary: 'Listar componentes con stock y estado' })
    @ApiQuery({ name: 'busqueda', required: false })
    @ApiQuery({ name: 'id_tipo', required: false })
    @ApiQuery({ name: 'id_categoria', required: false })
    @ApiQuery({ name: 'solo_criticos', required: false })
    @ApiQuery({ name: 'skip', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async listarComponentes(
        @Query('busqueda') busqueda?: string,
        @Query('id_tipo') idTipo?: string,
        @Query('id_categoria') idCategoria?: string,
        @Query('solo_criticos') soloCriticos?: string,
        @Query('skip') skip?: string,
        @Query('limit') limit?: string,
    ) {
        return this.inventarioService.listarComponentesConStock({
            busqueda,
            id_tipo: idTipo ? parseInt(idTipo, 10) : undefined,
            id_categoria: idCategoria ? parseInt(idCategoria, 10) : undefined,
            solo_criticos: soloCriticos === 'true',
            skip: skip ? parseInt(skip, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }

    @Get('kardex-global')
    @ApiOperation({ summary: 'Obtener Kardex General / Libro Mayor de Movimientos' })
    @ApiQuery({ name: 'tipo', required: false })
    @ApiQuery({ name: 'origen', required: false })
    @ApiQuery({ name: 'id_componente', required: false })
    @ApiQuery({ name: 'id_ubicacion', required: false })
    @ApiQuery({ name: 'busqueda', required: false })
    @ApiQuery({ name: 'fecha_inicio', required: false })
    @ApiQuery({ name: 'fecha_fin', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getKardexGlobal(
        @Query('tipo') tipo?: string,
        @Query('origen') origen?: string,
        @Query('id_componente') idComponente?: string,
        @Query('id_ubicacion') idUbicacion?: string,
        @Query('busqueda') busqueda?: string,
        @Query('fecha_inicio') fechaInicio?: string,
        @Query('fecha_fin') fechaFin?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.inventarioService.getKardexGlobal({
            tipo,
            origen,
            id_componente: idComponente ? parseInt(idComponente, 10) : undefined,
            id_ubicacion: idUbicacion ? parseInt(idUbicacion, 10) : undefined,
            busqueda,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 25,
        });
    }

    @Get('lotes')
    @ApiOperation({ summary: 'Listar lotes con trazabilidad y semáforo de vencimiento' })
    @ApiQuery({ name: 'id_componente', required: false })
    @ApiQuery({ name: 'estado', required: false })
    @ApiQuery({ name: 'busqueda', required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getLotes(
        @Query('id_componente') idComponente?: string,
        @Query('estado') estado?: string,
        @Query('busqueda') busqueda?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.inventarioService.getLotes({
            id_componente: idComponente ? parseInt(idComponente, 10) : undefined,
            estado,
            busqueda,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 25,
        });
    }

    @Get('bodegas')
    @ApiOperation({ summary: 'Listar bodegas activas con métricas de ocupación y valor' })
    async getBodegas() {
        return this.inventarioService.getBodegas();
    }

    @Post('bodegas')
    @ApiOperation({ summary: 'Crear una nueva bodega o almacén' })
    async crearBodega(@Body() dto: CrearBodegaDto) {
        return this.inventarioService.crearBodega(dto);
    }

    @Get('kardex/:idComponente')
    @ApiOperation({ summary: 'Obtener kardex individual de un componente' })
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
    async getAlertas(@Query('estado') estado?: string) {
        return this.inventarioService.getAlertasStock(estado);
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
    // OPERACIONES FÍSICAS DE ALMACÉN (ENTRADA, SALIDA, AJUSTE, TRASLADO)
    // ─────────────────────────────────────────────────────────────────────────────

    @Post('entrada')
    @ApiOperation({ summary: 'Registrar entrada de inventario con lote' })
    async registrarEntrada(@Body() dto: EntradaInventarioDto) {
        return this.inventarioService.registrarEntrada(dto);
    }

    @Post('salida')
    @ApiOperation({ summary: 'Registrar salida o despacho justificado de inventario' })
    async registrarSalida(@Body() dto: SalidaInventarioDto) {
        return this.inventarioService.registrarSalida(dto);
    }

    @Post('ajuste')
    @ApiOperation({ summary: 'Registrar ajuste de inventario (conteo físico o merma)' })
    async registrarAjuste(@Body() dto: AjusteInventarioDto) {
        return this.inventarioService.registrarAjuste(dto);
    }

    @Post('traslado')
    @ApiOperation({ summary: 'Registrar traslado entre bodegas' })
    async registrarTraslado(@Body() dto: TrasladoInventarioDto) {
        return this.inventarioService.registrarTraslado(dto);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VISTA MAESTRA Y CRUD DE COMPONENTE
    // ─────────────────────────────────────────────────────────────────────────────

    @Get('componente/:id')
    @ApiOperation({ summary: 'Obtener detalle logístico completo de un componente' })
    async getDetalleComponente(@Param('id', ParseIntPipe) id: number) {
        return this.inventarioService.getDetalleComponente(id);
    }

    @Put('componente/:id')
    @ApiOperation({ summary: 'Actualizar campos maestros de un componente' })
    async actualizarComponente(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ActualizarComponenteDto,
    ) {
        return this.inventarioService.actualizarComponente(id, dto);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CATÁLOGOS AUXILIARES (SELECTORES)
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

    @Get('motivos-ajuste')
    @ApiOperation({ summary: 'Obtener motivos de ajuste parametrizados' })
    async getMotivosAjuste() {
        return this.inventarioService.getMotivosAjuste();
    }
}
