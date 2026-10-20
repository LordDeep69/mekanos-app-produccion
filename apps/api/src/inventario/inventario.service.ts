// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO SERVICE - MOTOR TRANSACCIONAL ENTERPRISE (WMS / KARDEX / LOTES)
// ═══════════════════════════════════════════════════════════════════════════════

import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS Y TIPOS DE DOMINIO
// ─────────────────────────────────────────────────────────────────────────────

export enum TipoMovimiento {
    ENTRADA = 'ENTRADA',
    SALIDA = 'SALIDA',
    AJUSTE = 'AJUSTE',
    TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum OrigenMovimiento {
    COMPRA = 'COMPRA',
    CONSUMO_OS = 'CONSUMO_OS',
    REMISION = 'REMISION',
    DEVOLUCION = 'DEVOLUCION',
    CONTEO_FISICO = 'CONTEO_FISICO',
    MERMA = 'MERMA',
    CORRECCION_ERROR = 'CORRECCION_ERROR',
    INVENTARIO_INICIAL = 'INVENTARIO_INICIAL',
    TRASLADO_INTERNO = 'TRASLADO_INTERNO',
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface RegistrarMovimientoDto {
    tipo_movimiento: TipoMovimiento;
    origen_movimiento: OrigenMovimiento;
    id_componente: number;
    cantidad: number;
    costo_unitario?: number;
    id_ubicacion?: number;
    id_lote?: number;
    id_orden_servicio?: number;
    id_orden_compra?: number;
    id_remision?: number;
    justificacion?: string;
    observaciones?: string;
    realizado_por: number;
    aprobado_por?: number;
}

export interface EntradaInventarioDto {
    id_componente: number;
    cantidad: number;
    costo_unitario: number;
    id_ubicacion?: number;
    id_orden_compra?: number;
    id_proveedor?: number;
    numero_factura?: string;
    numero_lote_fabricante?: string;
    fecha_vencimiento?: string;
    motivo?: string;
    observaciones?: string;
    realizado_por: number;
}

export interface SalidaInventarioDto {
    id_componente: number;
    cantidad: number;
    id_ubicacion?: number;
    id_lote?: number;
    id_orden_servicio?: number;
    id_remision?: number;
    id_tecnico?: number;
    motivo?: string;
    justificacion?: string;
    observaciones?: string;
    realizado_por: number;
}

export interface AjusteInventarioDto {
    id_componente: number;
    cantidad_nueva: number;
    id_ubicacion?: number;
    motivo: string;
    justificacion: string;
    realizado_por: number;
    aprobado_por?: number;
}

export interface TrasladoInventarioDto {
    id_componente: number;
    cantidad: number;
    id_ubicacion_origen: number;
    id_ubicacion_destino: number;
    id_lote?: number;
    justificacion?: string;
    observaciones?: string;
    realizado_por: number;
}

export interface CrearBodegaDto {
    codigo_ubicacion: string;
    zona: string;
    pasillo?: string;
    estante?: string;
    nivel?: string;
    activo?: boolean;
}

export interface ActualizarComponenteDto {
    codigo_interno?: string;
    referencia_fabricante?: string;
    descripcion_corta?: string;
    descripcion_detallada?: string;
    marca?: string;
    id_tipo_componente?: number;
    tipo_comercial?: string;
    unidad_medida?: string;
    stock_minimo?: number;
    precio_compra?: number;
    precio_venta?: number;
    id_proveedor_principal?: number;
    observaciones?: string;
    notas_instalacion?: string;
    especificaciones_tecnicas?: any;
    es_inventariable?: boolean;
    activo?: boolean;
    reemplazado_por?: number;
    componentes_compatibles?: number[];
    modificado_por?: number;
}

@Injectable()
export class InventarioService {
    constructor(private readonly prisma: PrismaService) { }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERADOR DETERMINISTA DE CORRELATIVO LOT-YYYY-XXXX
    // ─────────────────────────────────────────────────────────────────────────

    private async generarSiguienteNumeroLote(txRunner?: any): Promise<string> {
        const tx = txRunner || this.prisma;
        const year = new Date().getFullYear();
        const rows = await tx.$queryRawUnsafe(`
            SELECT id, current_value FROM sequence_counter
            WHERE type = 'LOT' AND year = ${year}
            FOR UPDATE;
        `);

        let nextVal = 1;
        if (rows && rows.length > 0) {
            nextVal = Number(rows[0].current_value) + 1;
            await tx.$executeRawUnsafe(`
                UPDATE sequence_counter
                SET current_value = ${nextVal}, updated_at = NOW()
                WHERE id = ${rows[0].id};
            `);
        } else {
            const maxRes = await tx.$queryRawUnsafe(`
                SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM sequence_counter;
            `);
            const nextId = Number(maxRes[0]?.next_id || 300);
            await tx.$executeRawUnsafe(`
                INSERT INTO sequence_counter (id, type, year, current_value, created_at, updated_at)
                VALUES (${nextId}, 'LOT', ${year}, 1, NOW(), NOW());
            `);
            nextVal = 1;
        }

        return `LOT-${year}-${String(nextVal).padStart(4, '0')}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER DE SANITIZACIÓN WHITE-LABEL DE USUARIOS
    // ─────────────────────────────────────────────────────────────────────────

    private sanitizarNombreResponsable(user: any): string {
        if (!user) return 'Administrador del Sistema';
        const persona = user.persona;
        let nombre = '';
        if (persona) {
            nombre = `${persona.primer_nombre || ''} ${persona.primer_apellido || ''}`.trim() || persona.nombre_completo || '';
        }
        if (!nombre) {
            nombre = user.nombre_usuario || user.username || '';
        }
        if (!nombre || /admin(\s+mekanos)?/i.test(nombre)) {
            return 'Administrador del Sistema';
        }
        return nombre;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPERACIONES DE ALMACÉN TRANSACCIONALES (ENTRADA, SALIDA, AJUSTE, TRASLADO)
    // ═══════════════════════════════════════════════════════════════════════════

    async registrarEntrada(dto: EntradaInventarioDto) {
        if (dto.cantidad <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }
        if (dto.costo_unitario < 0) {
            throw new BadRequestException('El costo unitario no puede ser negativo');
        }

        return this.prisma.$transaction(async (tx) => {
            const componente = await tx.catalogo_componentes.findUnique({
                where: { id_componente: dto.id_componente },
            });
            if (!componente) {
                throw new NotFoundException(`Componente ${dto.id_componente} no encontrado`);
            }

            const idUbicacion = dto.id_ubicacion || 1;
            const stockActual = componente.stock_actual || 0;
            const nuevoStock = stockActual + dto.cantidad;

            // 1. Generar Lote físico en lotes_componentes
            const codigoLote = await this.generarSiguienteNumeroLote(tx);
            const fechaVenc = dto.fecha_vencimiento ? new Date(dto.fecha_vencimiento) : null;

            const loteCreado = await tx.lotes_componentes.create({
                data: {
                    codigo_lote: codigoLote,
                    id_componente: dto.id_componente,
                    fecha_fabricacion: new Date(),
                    fecha_vencimiento: fechaVenc,
                    cantidad_inicial: dto.cantidad,
                    cantidad_actual: dto.cantidad,
                    estado_lote: 'DISPONIBLE',
                    id_proveedor: dto.id_proveedor || componente.id_proveedor_principal || null,
                    numero_factura_proveedor: dto.numero_lote_fabricante || dto.numero_factura || null,
                    observaciones: dto.observaciones || `Ingreso de inventario (${dto.motivo || 'Operación Manual'})`,
                    fecha_ingreso: new Date(),
                    ingresado_por: dto.realizado_por || 1,
                },
            });

            // 2. Movimiento inmutable de inventario (Kardex)
            const movimiento = await tx.movimientos_inventario.create({
                data: {
                    tipo_movimiento: 'ENTRADA',
                    origen_movimiento: dto.id_orden_compra ? 'COMPRA' : (dto.motivo as any || 'INVENTARIO_INICIAL'),
                    id_componente: dto.id_componente,
                    cantidad: new Decimal(dto.cantidad),
                    costo_unitario: new Decimal(dto.costo_unitario),
                    id_ubicacion: idUbicacion,
                    id_lote: loteCreado.id_lote,
                    id_orden_compra: dto.id_orden_compra || null,
                    justificacion: dto.motivo || 'Entrada manual de almacén',
                    observaciones: dto.observaciones || `Ingreso de ${dto.cantidad} unidades a ${codigoLote}`,
                    realizado_por: dto.realizado_por || 1,
                    fecha_movimiento: new Date(),
                },
            });

            // 3. Actualizar stock actual y CPP en catálogo
            const costoAnterior = Number(componente.precio_compra || 0);
            const cantidadAnterior = stockActual;
            const cantidadNueva = dto.cantidad;
            const costoNuevo = dto.costo_unitario;
            const cpp = nuevoStock > 0 ? (costoAnterior * cantidadAnterior + costoNuevo * cantidadNueva) / nuevoStock : costoNuevo;

            await tx.catalogo_componentes.update({
                where: { id_componente: dto.id_componente },
                data: {
                    stock_actual: nuevoStock,
                    precio_compra: new Decimal(cpp.toFixed(2)),
                    fecha_modificacion: new Date(),
                    modificado_por: dto.realizado_por || 1,
                },
            });

            return {
                success: true,
                mensaje: `Entrada registrada exitosamente en lote ${codigoLote}`,
                movimiento,
                lote: loteCreado,
                stock_anterior: stockActual,
                stock_actual: nuevoStock,
            };
        });
    }

    async registrarSalida(dto: SalidaInventarioDto) {
        if (dto.cantidad <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        return this.prisma.$transaction(async (tx) => {
            const componente = await tx.catalogo_componentes.findUnique({
                where: { id_componente: dto.id_componente },
            });
            if (!componente) {
                throw new NotFoundException(`Componente ${dto.id_componente} no encontrado`);
            }

            const stockActual = componente.stock_actual || 0;
            if (stockActual < dto.cantidad) {
                throw new BadRequestException(`Stock insuficiente en el sistema. Disponible: ${stockActual}, Solicitado: ${dto.cantidad}`);
            }

            const idUbicacion = dto.id_ubicacion || 1;

            // 1. Obtener lotes disponibles para descontar por FIFO/FEFO
            let lotesDisponibles = [];
            if (dto.id_lote) {
                const loteEspecifico = await tx.lotes_componentes.findUnique({
                    where: { id_lote: dto.id_lote },
                });
                if (!loteEspecifico || Number(loteEspecifico.cantidad_actual) < dto.cantidad) {
                    throw new BadRequestException(`El lote seleccionado no tiene existencias suficientes (${loteEspecifico?.cantidad_actual || 0} disponibles)`);
                }
                lotesDisponibles = [loteEspecifico];
            } else {
                lotesDisponibles = await tx.lotes_componentes.findMany({
                    where: {
                        id_componente: dto.id_componente,
                        estado_lote: 'DISPONIBLE',
                        cantidad_actual: { gt: 0 },
                    },
                    orderBy: [
                        { fecha_vencimiento: 'asc' },
                        { fecha_ingreso: 'asc' },
                    ],
                });
            }

            let cantidadPendiente = dto.cantidad;
            let ultimoLoteImpactado = null;

            for (const lote of lotesDisponibles) {
                if (cantidadPendiente <= 0) break;
                const cantLote = Number(lote.cantidad_actual);
                const aDescontar = Math.min(cantLote, cantidadPendiente);
                const nuevoRemanente = cantLote - aDescontar;

                await tx.lotes_componentes.update({
                    where: { id_lote: lote.id_lote },
                    data: {
                        cantidad_actual: new Decimal(nuevoRemanente),
                        estado_lote: nuevoRemanente === 0 ? 'AGOTADO' : 'DISPONIBLE',
                    },
                });

                ultimoLoteImpactado = lote;
                cantidadPendiente -= aDescontar;
            }

            // 2. Movimiento inmutable de inventario (Kardex)
            const nuevoStock = stockActual - dto.cantidad;
            const movimiento = await tx.movimientos_inventario.create({
                data: {
                    tipo_movimiento: 'SALIDA',
                    origen_movimiento: dto.id_orden_servicio ? 'CONSUMO_OS' : (dto.motivo as any || 'CONSUMO_OS'),
                    id_componente: dto.id_componente,
                    cantidad: new Decimal(-dto.cantidad),
                    costo_unitario: componente.precio_compra,
                    id_ubicacion: idUbicacion,
                    id_lote: ultimoLoteImpactado?.id_lote || null,
                    id_orden_servicio: dto.id_orden_servicio || null,
                    id_remision: dto.id_remision || null,
                    justificacion: dto.justificacion || dto.motivo || 'Salida de almacén',
                    observaciones: dto.observaciones || `Despacho de ${dto.cantidad} unidades`,
                    realizado_por: dto.realizado_por || 1,
                    fecha_movimiento: new Date(),
                },
            });

            // 3. Actualizar stock actual en catálogo
            await tx.catalogo_componentes.update({
                where: { id_componente: dto.id_componente },
                data: {
                    stock_actual: nuevoStock,
                    fecha_modificacion: new Date(),
                    modificado_por: dto.realizado_por || 1,
                },
            });

            // 4. Alerta de stock bajo si aplica
            const stockMinimo = componente.stock_minimo || 0;
            if (nuevoStock <= stockMinimo) {
                await tx.alertas_stock.create({
                    data: {
                        tipo_alerta: 'STOCK_MINIMO',
                        nivel: nuevoStock === 0 ? 'CRITICO' : 'ADVERTENCIA',
                        id_componente: dto.id_componente,
                        mensaje: `Stock bajo tras salida: ${nuevoStock} unidades (mínimo: ${stockMinimo})`,
                        estado: 'PENDIENTE',
                    },
                });
            }

            return {
                success: true,
                mensaje: `Salida de ${dto.cantidad} unidades registrada con éxito`,
                movimiento,
                stock_anterior: stockActual,
                stock_actual: nuevoStock,
            };
        });
    }

    async registrarAjuste(dto: AjusteInventarioDto) {
        return this.prisma.$transaction(async (tx) => {
            const componente = await tx.catalogo_componentes.findUnique({
                where: { id_componente: dto.id_componente },
            });
            if (!componente) {
                throw new NotFoundException(`Componente ${dto.id_componente} no encontrado`);
            }

            const stockActual = componente.stock_actual || 0;
            const diferencia = dto.cantidad_nueva - stockActual;

            if (diferencia === 0) {
                return {
                    success: true,
                    mensaje: 'El stock físico indicado coincide exactamente con el inventario actual.',
                    stock_actual: stockActual,
                };
            }

            const idUbicacion = dto.id_ubicacion || 1;

            if (diferencia > 0) {
                // Ajuste Positivo (Sobrante / Regularización): Crea lote nuevo
                const codigoLote = await this.generarSiguienteNumeroLote(tx);
                const loteCreado = await tx.lotes_componentes.create({
                    data: {
                        codigo_lote: codigoLote,
                        id_componente: dto.id_componente,
                        fecha_fabricacion: new Date(),
                        cantidad_inicial: diferencia,
                        cantidad_actual: diferencia,
                        estado_lote: 'DISPONIBLE',
                        id_proveedor: componente.id_proveedor_principal || null,
                        observaciones: `Ajuste positivo (${dto.motivo}): ${dto.justificacion}`,
                        fecha_ingreso: new Date(),
                        ingresado_por: dto.realizado_por || 1,
                    },
                });

                await tx.movimientos_inventario.create({
                    data: {
                        tipo_movimiento: 'AJUSTE',
                        origen_movimiento: dto.motivo as any || 'CONTEO_FISICO',
                        id_componente: dto.id_componente,
                        cantidad: new Decimal(diferencia),
                        costo_unitario: componente.precio_compra,
                        id_ubicacion: idUbicacion,
                        id_lote: loteCreado.id_lote,
                        justificacion: dto.justificacion,
                        observaciones: `Ajuste positivo por conteo: +${diferencia} unidades`,
                        realizado_por: dto.realizado_por || 1,
                        aprobado_por: dto.aprobado_por || null,
                        fecha_movimiento: new Date(),
                    },
                });
            } else {
                // Ajuste Negativo (Faltante / Merma): Descuenta de lotes por FIFO
                let cantidadADescontar = Math.abs(diferencia);
                const lotes = await tx.lotes_componentes.findMany({
                    where: {
                        id_componente: dto.id_componente,
                        estado_lote: 'DISPONIBLE',
                        cantidad_actual: { gt: 0 },
                    },
                    orderBy: { fecha_ingreso: 'asc' },
                });

                for (const lote of lotes) {
                    if (cantidadADescontar <= 0) break;
                    const remanente = Number(lote.cantidad_actual);
                    const tomar = Math.min(remanente, cantidadADescontar);
                    const nuevo = remanente - tomar;
                    await tx.lotes_componentes.update({
                        where: { id_lote: lote.id_lote },
                        data: {
                            cantidad_actual: new Decimal(nuevo),
                            estado_lote: nuevo === 0 ? 'AGOTADO' : 'DISPONIBLE',
                        },
                    });
                    cantidadADescontar -= tomar;
                }

                await tx.movimientos_inventario.create({
                    data: {
                        tipo_movimiento: 'AJUSTE',
                        origen_movimiento: dto.motivo as any || 'CONTEO_FISICO',
                        id_componente: dto.id_componente,
                        cantidad: new Decimal(diferencia),
                        costo_unitario: componente.precio_compra,
                        id_ubicacion: idUbicacion,
                        justificacion: dto.justificacion,
                        observaciones: `Ajuste negativo por conteo: ${diferencia} unidades`,
                        realizado_por: dto.realizado_por || 1,
                        aprobado_por: dto.aprobado_por || null,
                        fecha_movimiento: new Date(),
                    },
                });
            }

            await tx.catalogo_componentes.update({
                where: { id_componente: dto.id_componente },
                data: {
                    stock_actual: dto.cantidad_nueva,
                    fecha_modificacion: new Date(),
                    modificado_por: dto.realizado_por || 1,
                },
            });

            return {
                success: true,
                mensaje: `Ajuste completado. Stock actualizado de ${stockActual} a ${dto.cantidad_nueva}`,
                stock_anterior: stockActual,
                stock_actual: dto.cantidad_nueva,
                diferencia,
            };
        });
    }

    async registrarTraslado(dto: TrasladoInventarioDto) {
        if (dto.cantidad <= 0) {
            throw new BadRequestException('La cantidad a trasladar debe ser mayor a 0');
        }
        if (dto.id_ubicacion_origen === dto.id_ubicacion_destino) {
            throw new BadRequestException('La bodega de origen y destino deben ser distintas');
        }

        return this.prisma.$transaction(async (tx) => {
            const componente = await tx.catalogo_componentes.findUnique({
                where: { id_componente: dto.id_componente },
            });
            if (!componente) {
                throw new NotFoundException(`Componente ${dto.id_componente} no encontrado`);
            }

            const [origen, destino] = await Promise.all([
                tx.ubicaciones_bodega.findUnique({ where: { id_ubicacion: dto.id_ubicacion_origen } }),
                tx.ubicaciones_bodega.findUnique({ where: { id_ubicacion: dto.id_ubicacion_destino } }),
            ]);
            if (!origen || !destino) {
                throw new NotFoundException('Bodega origen o destino no encontrada');
            }

            // Descontar del lote origen
            let loteOrigen = null;
            if (dto.id_lote) {
                loteOrigen = await tx.lotes_componentes.findUnique({ where: { id_lote: dto.id_lote } });
            } else {
                loteOrigen = await tx.lotes_componentes.findFirst({
                    where: {
                        id_componente: dto.id_componente,
                        estado_lote: 'DISPONIBLE',
                        cantidad_actual: { gte: dto.cantidad },
                    },
                    orderBy: { fecha_ingreso: 'asc' },
                });
            }

            if (!loteOrigen || Number(loteOrigen.cantidad_actual) < dto.cantidad) {
                throw new BadRequestException(`No hay existencias suficientes en el lote de la bodega origen.`);
            }

            // Actualizar lote origen
            const nuevoOrigen = Number(loteOrigen.cantidad_actual) - dto.cantidad;
            await tx.lotes_componentes.update({
                where: { id_lote: loteOrigen.id_lote },
                data: {
                    cantidad_actual: new Decimal(nuevoOrigen),
                    estado_lote: nuevoOrigen === 0 ? 'AGOTADO' : 'DISPONIBLE',
                },
            });

            // Crear lote nuevo en la bodega destino
            const codigoLoteDestino = await this.generarSiguienteNumeroLote(tx);
            const loteDestino = await tx.lotes_componentes.create({
                data: {
                    codigo_lote: codigoLoteDestino,
                    id_componente: dto.id_componente,
                    fecha_fabricacion: loteOrigen.fecha_fabricacion,
                    fecha_vencimiento: loteOrigen.fecha_vencimiento,
                    cantidad_inicial: dto.cantidad,
                    cantidad_actual: dto.cantidad,
                    estado_lote: 'DISPONIBLE',
                    id_proveedor: loteOrigen.id_proveedor,
                    numero_factura_proveedor: loteOrigen.numero_factura_proveedor,
                    observaciones: `Traslado desde ${origen.codigo_ubicacion} (Lote orig: ${loteOrigen.codigo_lote}). ${dto.observaciones || ''}`,
                    fecha_ingreso: new Date(),
                    ingresado_por: dto.realizado_por || 1,
                },
            });

            // Registrar movimientos de traslado
            await tx.movimientos_inventario.create({
                data: {
                    tipo_movimiento: 'TRANSFERENCIA',
                    origen_movimiento: 'TRASLADO_INTERNO',
                    id_componente: dto.id_componente,
                    cantidad: new Decimal(-dto.cantidad),
                    costo_unitario: componente.precio_compra,
                    id_ubicacion: dto.id_ubicacion_origen,
                    id_lote: loteOrigen.id_lote,
                    justificacion: `Traslado hacia ${destino.codigo_ubicacion}: ${dto.justificacion || 'Transferencia entre bodegas'}`,
                    observaciones: dto.observaciones,
                    realizado_por: dto.realizado_por || 1,
                    fecha_movimiento: new Date(),
                },
            });

            await tx.movimientos_inventario.create({
                data: {
                    tipo_movimiento: 'TRANSFERENCIA',
                    origen_movimiento: 'TRASLADO_INTERNO',
                    id_componente: dto.id_componente,
                    cantidad: new Decimal(dto.cantidad),
                    costo_unitario: componente.precio_compra,
                    id_ubicacion: dto.id_ubicacion_destino,
                    id_lote: loteDestino.id_lote,
                    justificacion: `Recepción por traslado desde ${origen.codigo_ubicacion}`,
                    observaciones: dto.observaciones,
                    realizado_por: dto.realizado_por || 1,
                    fecha_movimiento: new Date(),
                },
            });

            return {
                success: true,
                mensaje: `Traslado de ${dto.cantidad} unidades desde ${origen.codigo_ubicacion} hacia ${destino.codigo_ubicacion} completado exitosamente.`,
                lote_destino: codigoLoteDestino,
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DASHBOARD KPIs DETERMINISTAS (SOLO ACTIVOS CON EXISTENCIAS REALES)
    // ═══════════════════════════════════════════════════════════════════════════

    async getDashboardKPIs() {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const [
            valorRes,
            totalItems,
            itemsConStock,
            itemsCriticosRes,
            totalLotesActivos,
            totalMovimientos,
            movimientosHoy,
            alertasPendientes,
            totalBodegas,
        ] = await Promise.all([
            // Valor total real en almacén de artículos activos con existencias
            this.prisma.$queryRaw<[{ valor: number }]>`
                SELECT COALESCE(SUM(stock_actual * COALESCE(precio_compra, 0)), 0)::numeric as valor
                FROM catalogo_componentes
                WHERE activo = true AND es_inventariable = true AND stock_actual > 0;
            `,
            // Total SKUs catalogados activos
            this.prisma.catalogo_componentes.count({
                where: { activo: true, es_inventariable: true },
            }),
            // SKUs con stock disponible > 0
            this.prisma.catalogo_componentes.count({
                where: { activo: true, es_inventariable: true, stock_actual: { gt: 0 } },
            }),
            // Ítems bajo stock mínimo
            this.prisma.$queryRaw<[{ count: number }]>`
                SELECT COUNT(*)::int as count 
                FROM catalogo_componentes 
                WHERE activo = true AND es_inventariable = true AND stock_minimo > 0 AND stock_actual <= stock_minimo;
            `,
            // Total de lotes activos con saldo disponible
            this.prisma.lotes_componentes.count({
                where: { estado_lote: 'DISPONIBLE', cantidad_actual: { gt: 0 } },
            }),
            // Total de transacciones en Kardex
            this.prisma.movimientos_inventario.count(),
            // Movimientos registrados hoy
            this.prisma.movimientos_inventario.count({
                where: { fecha_movimiento: { gte: hoy } },
            }),
            // Alertas activas pendientes
            this.prisma.alertas_stock.count({
                where: { estado: { in: ['PENDIENTE', 'VISTA'] } },
            }),
            // Bodegas activas
            this.prisma.ubicaciones_bodega.count({
                where: { activo: true },
            }),
        ]);

        return {
            kpis: {
                valor_inventario: Number(valorRes[0]?.valor || 0),
                total_items: totalItems,
                items_con_stock: itemsConStock,
                items_criticos: Number(itemsCriticosRes[0]?.count || 0),
                total_lotes_activos: totalLotesActivos,
                total_movimientos: totalMovimientos,
                movimientos_hoy: movimientosHoy,
                alertas_pendientes: alertasPendientes,
                total_bodegas: totalBodegas,
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LISTADO DE EXISTENCIAS Y SALUD DE STOCK (TABLA PESTAÑA 1)
    // ═══════════════════════════════════════════════════════════════════════════

    async listarComponentesConStock(filtros?: {
        busqueda?: string;
        id_tipo?: number;
        id_categoria?: number;
        id_ubicacion?: number;
        estado_stock?: string;
        solo_criticos?: boolean;
        skip?: number;
        limit?: number;
    }) {
        const where: any = {
            activo: true,
            es_inventariable: true,
        };

        if (filtros?.busqueda) {
            where.OR = [
                { codigo_interno: { contains: filtros.busqueda, mode: 'insensitive' } },
                { referencia_fabricante: { contains: filtros.busqueda, mode: 'insensitive' } },
                { descripcion_corta: { contains: filtros.busqueda, mode: 'insensitive' } },
                { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
            ];
        }

        if (filtros?.id_tipo) {
            where.id_tipo_componente = filtros.id_tipo;
        }

        if (filtros?.id_categoria) {
            where.id_categoria = filtros.id_categoria;
        }

        if (filtros?.id_ubicacion) {
            where.lotes_componentes = {
                some: {
                    movimientos_inventario: {
                        some: {
                            id_ubicacion: filtros.id_ubicacion,
                        },
                    },
                    cantidad_actual: { gt: 0 },
                },
            };
        }

        if (filtros?.estado_stock === 'EN_STOCK') {
            where.stock_actual = { gt: 0 };
        } else if (filtros?.estado_stock === 'AGOTADO') {
            where.stock_actual = 0;
        } else if (filtros?.estado_stock === 'BAJO' || filtros?.solo_criticos) {
            const criticos = await this.prisma.$queryRaw<Array<{ id_componente: number }>>`
                SELECT id_componente FROM catalogo_componentes
                WHERE activo = true AND es_inventariable = true AND stock_minimo > 0 AND stock_actual <= stock_minimo;
            `;
            const ids = criticos.map((c) => c.id_componente);
            where.id_componente = { in: ids.length > 0 ? ids : [-1] };
        }

        const [data, total] = await Promise.all([
            this.prisma.catalogo_componentes.findMany({
                where,
                include: {
                    tipos_componente: true,
                    categorias_componente: {
                        select: {
                            id_categoria: true,
                            nombre: true,
                            codigo_categoria: true,
                            categoria_padre: {
                                select: { id_categoria: true, nombre: true },
                            },
                        },
                    },
                    lotes_componentes: {
                        where: { estado_lote: 'DISPONIBLE', cantidad_actual: { gt: 0 } },
                        select: {
                            id_lote: true,
                            codigo_lote: true,
                            cantidad_actual: true,
                            fecha_vencimiento: true,
                            movimientos_inventario: {
                                take: 1,
                                orderBy: { fecha_movimiento: 'desc' },
                                select: {
                                    id_ubicacion: true,
                                    ubicaciones_bodega: {
                                        select: {
                                            id_ubicacion: true,
                                            codigo_ubicacion: true,
                                            zona: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: [
                    { stock_actual: 'desc' },
                    { descripcion_corta: 'asc' },
                ],
                skip: filtros?.skip || 0,
                take: filtros?.limit || 50,
            }),
            this.prisma.catalogo_componentes.count({ where }),
        ]);

        return {
            data: data.map((c) => {
                const stockActual = c.stock_actual || 0;
                const stockMinimo = c.stock_minimo || 0;

                let estadoStock = 'OK';
                if (stockActual === 0) {
                    estadoStock = 'AGOTADO';
                } else if (stockMinimo > 0 && stockActual <= stockMinimo) {
                    estadoStock = 'BAJO';
                }

                const catPadre = (c.categorias_componente as any)?.categoria_padre?.nombre;
                const catNombre = c.categorias_componente?.nombre;
                const catTexto = catNombre || 'General';
                const catCompleta = catPadre ? `${catPadre} > ${catNombre}` : catTexto;

                // Enriquecer lotes con datos de su última ubicación en bodega
                const lotesEnriquecidos = (c.lotes_componentes || []).map((l: any) => {
                    const ultimoMov = l.movimientos_inventario?.[0];
                    const ubi = ultimoMov?.ubicaciones_bodega;
                    return {
                        id_lote: l.id_lote,
                        codigo_lote: l.codigo_lote,
                        cantidad_actual: Number(l.cantidad_actual),
                        fecha_vencimiento: l.fecha_vencimiento,
                        id_ubicacion: ubi?.id_ubicacion || ultimoMov?.id_ubicacion || 1,
                        bodega_codigo: ubi?.codigo_ubicacion || 'BOD-CENTRAL',
                        bodega_nombre: ubi?.zona || 'Bodega Central Taller',
                    };
                });

                // Agregación de existencias por bodega
                const bodegasMap = new Map<number, { id_ubicacion: number; codigo: string; nombre: string; stock: number }>();
                for (const lote of lotesEnriquecidos) {
                    const idUbi = lote.id_ubicacion;
                    const existing = bodegasMap.get(idUbi) || {
                        id_ubicacion: idUbi,
                        codigo: lote.bodega_codigo,
                        nombre: lote.bodega_nombre,
                        stock: 0,
                    };
                    existing.stock += lote.cantidad_actual;
                    bodegasMap.set(idUbi, existing);
                }

                // Si tiene existencias registradas pero no lotes en movimientos, asociar a Bodega Central
                if (bodegasMap.size === 0 && stockActual > 0) {
                    bodegasMap.set(1, {
                        id_ubicacion: 1,
                        codigo: 'BOD-CENTRAL',
                        nombre: 'Bodega Central Taller',
                        stock: stockActual,
                    });
                }

                const bodegasComponente = Array.from(bodegasMap.values());

                return {
                    id_componente: c.id_componente,
                    codigo: c.codigo_interno || `ART-${c.id_componente}`,
                    referencia: c.referencia_fabricante || '--',
                    nombre: c.descripcion_corta,
                    marca: c.marca || 'N/A',
                    tipo: catTexto,
                    categoria: catTexto,
                    categoria_padre: catPadre || null,
                    categoria_completa: catCompleta,
                    stock_actual: stockActual,
                    stock_minimo: stockMinimo,
                    estado_stock: estadoStock,
                    precio_compra: c.precio_compra ? Number(c.precio_compra) : 0,
                    precio_venta: c.precio_venta ? Number(c.precio_venta) : null,
                    valor_stock: c.precio_compra ? Number(c.precio_compra) * stockActual : 0,
                    unidad: c.unidad_medida || 'UND',
                    bodegas: bodegasComponente,
                    lotes_activos: lotesEnriquecidos,
                    activo: c.activo,
                };
            }),
            meta: {
                total,
                skip: filtros?.skip || 0,
                limit: filtros?.limit || 50,
            },
        };
    }

    async getComponentesStock(filtros?: {
        busqueda?: string;
        id_tipo?: number;
        id_categoria?: number;
        id_ubicacion?: number;
        estado_stock?: string;
        solo_criticos?: boolean;
        skip?: number;
        limit?: number;
    }) {
        return this.listarComponentesConStock(filtros);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // KARDEX GLOBAL AUDITABLE (PESTAÑA 2)
    // ═══════════════════════════════════════════════════════════════════════════

    async getKardexGlobal(filtros?: {
        tipo?: string;
        origen?: string;
        id_componente?: number;
        id_ubicacion?: number;
        busqueda?: string;
        fecha_inicio?: string;
        fecha_fin?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filtros?.page ? Math.max(1, filtros.page) : 1;
        const limit = filtros?.limit ? Math.max(1, filtros.limit) : 25;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (filtros?.tipo) {
            where.tipo_movimiento = filtros.tipo;
        }
        if (filtros?.origen) {
            where.origen_movimiento = filtros.origen;
        }
        if (filtros?.id_componente) {
            where.id_componente = filtros.id_componente;
        }
        if (filtros?.id_ubicacion) {
            where.id_ubicacion = filtros.id_ubicacion;
        }
        if (filtros?.fecha_inicio || filtros?.fecha_fin) {
            where.fecha_movimiento = {};
            if (filtros.fecha_inicio) where.fecha_movimiento.gte = new Date(filtros.fecha_inicio);
            if (filtros.fecha_fin) where.fecha_movimiento.lte = new Date(filtros.fecha_fin);
        }

        if (filtros?.busqueda) {
            where.OR = [
                { justificacion: { contains: filtros.busqueda, mode: 'insensitive' } },
                { observaciones: { contains: filtros.busqueda, mode: 'insensitive' } },
                { catalogo_componentes: { descripcion_corta: { contains: filtros.busqueda, mode: 'insensitive' } } },
                { catalogo_componentes: { codigo_interno: { contains: filtros.busqueda, mode: 'insensitive' } } },
            ];
        }

        const [movimientos, total] = await Promise.all([
            this.prisma.movimientos_inventario.findMany({
                where,
                include: {
                    catalogo_componentes: {
                        select: {
                            id_componente: true,
                            codigo_interno: true,
                            referencia_fabricante: true,
                            descripcion_corta: true,
                            unidad_medida: true,
                        },
                    },
                    ubicaciones_bodega: {
                        select: {
                            id_ubicacion: true,
                            codigo_ubicacion: true,
                            zona: true,
                        },
                    },
                    lotes_componentes: {
                        select: {
                            id_lote: true,
                            codigo_lote: true,
                            fecha_vencimiento: true,
                        },
                    },
                    ordenes_compra: {
                        select: { id_orden_compra: true, numero_orden_compra: true },
                    },
                    ordenes_servicio: {
                        select: { id_orden_servicio: true, numero_orden: true },
                    },
                },
                orderBy: { fecha_movimiento: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.movimientos_inventario.count({ where }),
        ]);

        const userIds = [...new Set(movimientos.map((m: any) => m.realizado_por).filter(Boolean))];
        const usuarios = userIds.length > 0
            ? await this.prisma.usuarios.findMany({
                where: { id_usuario: { in: userIds } },
                include: { persona: true },
            })
            : [];
        const userMap = new Map(usuarios.map((u) => [u.id_usuario, u]));

        return {
            data: movimientos.map((m: any) => {
                const user = userMap.get(m.realizado_por);
                const nombreUsuario = this.sanitizarNombreResponsable(user);

                return {
                    id_movimiento: m.id_movimiento,
                    fecha: m.fecha_movimiento,
                    tipo: m.tipo_movimiento,
                    origen: m.origen_movimiento,
                    cantidad: Number(m.cantidad),
                    costo_unitario: m.costo_unitario ? Number(m.costo_unitario) : null,
                    componente: {
                        id: m.catalogo_componentes?.id_componente,
                        codigo: m.catalogo_componentes?.codigo_interno || `ART-${m.catalogo_componentes?.id_componente}`,
                        referencia: m.catalogo_componentes?.referencia_fabricante,
                        nombre: m.catalogo_componentes?.descripcion_corta,
                        unidad: m.catalogo_componentes?.unidad_medida,
                    },
                    bodega: m.ubicaciones_bodega ? {
                        id: m.ubicaciones_bodega.id_ubicacion,
                        codigo: m.ubicaciones_bodega.codigo_ubicacion,
                        zona: m.ubicaciones_bodega.zona,
                    } : null,
                    lote: m.lotes_componentes ? {
                        id: m.lotes_componentes.id_lote,
                        codigo: m.lotes_componentes.codigo_lote,
                        vencimiento: m.lotes_componentes.fecha_vencimiento,
                    } : null,
                    documento_soporte: m.ordenes_compra?.numero_orden_compra ||
                        m.ordenes_servicio?.numero_orden ||
                        m.justificacion || '--',
                    justificacion: m.justificacion,
                    observaciones: m.observaciones,
                    realizado_por: nombreUsuario,
                };
            }),
            meta: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONTROL DE LOTES Y TRAZABILIDAD (PESTAÑA 3)
    // ═══════════════════════════════════════════════════════════════════════════

    async getLotes(filtros?: {
        id_componente?: number;
        id_ubicacion?: number;
        estado?: string;
        busqueda?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filtros?.page ? Math.max(1, filtros.page) : 1;
        const limit = filtros?.limit ? Math.max(1, filtros.limit) : 25;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (filtros?.id_componente) where.id_componente = filtros.id_componente;
        if (filtros?.estado && filtros.estado !== 'TODOS') where.estado_lote = filtros.estado;

        if (filtros?.busqueda) {
            where.OR = [
                { codigo_lote: { contains: filtros.busqueda, mode: 'insensitive' } },
                { numero_factura_proveedor: { contains: filtros.busqueda, mode: 'insensitive' } },
                { catalogo_componentes: { descripcion_corta: { contains: filtros.busqueda, mode: 'insensitive' } } },
                { catalogo_componentes: { codigo_interno: { contains: filtros.busqueda, mode: 'insensitive' } } },
            ];
        }

        const [lotes, total] = await Promise.all([
            this.prisma.lotes_componentes.findMany({
                where,
                include: {
                    catalogo_componentes: {
                        select: {
                            id_componente: true,
                            codigo_interno: true,
                            referencia_fabricante: true,
                            descripcion_corta: true,
                            unidad_medida: true,
                            precio_compra: true,
                        },
                    },
                    proveedores: {
                        include: {
                            persona: { select: { razon_social: true, nombre_completo: true } },
                        },
                    },
                    movimientos_inventario: {
                        take: 1,
                        orderBy: { fecha_movimiento: 'desc' },
                        include: {
                            ubicaciones_bodega: true,
                        },
                    },
                },
                orderBy: { fecha_ingreso: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.lotes_componentes.count({ where }),
        ]);

        const hoy = new Date();

        return {
            data: lotes.map((l: any) => {
                let diasParaVencer: number | null = null;
                let semaforo: 'OK' | 'PROXIMO' | 'CRITICO' | 'VENCIDO' | 'NO_APLICA' = 'NO_APLICA';

                if (l.fecha_vencimiento) {
                    const diffTime = new Date(l.fecha_vencimiento).getTime() - hoy.getTime();
                    diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diasParaVencer <= 0) semaforo = 'VENCIDO';
                    else if (diasParaVencer <= 30) semaforo = 'CRITICO';
                    else if (diasParaVencer <= 90) semaforo = 'PROXIMO';
                    else semaforo = 'OK';
                }

                const ubicacion = l.movimientos_inventario?.[0]?.ubicaciones_bodega;

                return {
                    id_lote: l.id_lote,
                    codigo_lote: l.codigo_lote,
                    numero_lote_fabricante: l.numero_factura_proveedor || '--',
                    componente: {
                        id: l.catalogo_componentes?.id_componente,
                        codigo: l.catalogo_componentes?.codigo_interno || `ART-${l.catalogo_componentes?.id_componente}`,
                        referencia: l.catalogo_componentes?.referencia_fabricante,
                        nombre: l.catalogo_componentes?.descripcion_corta,
                        unidad: l.catalogo_componentes?.unidad_medida,
                        costo: l.catalogo_componentes?.precio_compra ? Number(l.catalogo_componentes.precio_compra) : 0,
                    },
                    bodega: ubicacion ? {
                        id: ubicacion.id_ubicacion,
                        codigo: ubicacion.codigo_ubicacion,
                        zona: ubicacion.zona,
                    } : { id: 1, codigo: 'BOD-CENTRAL', zona: 'Bodega Central Taller' },
                    cantidad_inicial: Number(l.cantidad_inicial),
                    cantidad_actual: Number(l.cantidad_actual),
                    estado_lote: l.estado_lote,
                    fecha_ingreso: l.fecha_ingreso,
                    fecha_fabricacion: l.fecha_fabricacion,
                    fecha_vencimiento: l.fecha_vencimiento,
                    dias_para_vencer: diasParaVencer,
                    semaforo,
                    proveedor: l.proveedores?.persona
                        ? (l.proveedores.persona.razon_social || l.proveedores.persona.nombre_completo)
                        : '--',
                    observaciones: l.observaciones,
                };
            }),
            meta: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit),
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GESTIÓN DE BODEGAS Y ALMACENES (PESTAÑA 4)
    // ═══════════════════════════════════════════════════════════════════════════

    async getBodegas() {
        const bodegas = await this.prisma.ubicaciones_bodega.findMany({
            where: { activo: true },
            orderBy: { id_ubicacion: 'asc' },
        });

        // Calcular métricas agregadas por cada bodega
        const resultado = await Promise.all(
            bodegas.map(async (b) => {
                const movs = await this.prisma.movimientos_inventario.findMany({
                    where: { id_ubicacion: b.id_ubicacion },
                    select: {
                        id_componente: true,
                        id_lote: true,
                    },
                });

                const lotesIds = Array.from(new Set(movs.map(m => m.id_lote).filter(Boolean))) as number[];

                let totalUnidades = 0;
                let valorTotal = 0;
                let totalSkus = 0;

                if (lotesIds.length > 0) {
                    const lotes = await this.prisma.lotes_componentes.findMany({
                        where: {
                            id_lote: { in: lotesIds },
                            cantidad_actual: { gt: 0 },
                        },
                        include: {
                            catalogo_componentes: { select: { id_componente: true, precio_compra: true } },
                        },
                    });

                    const skusSet = new Set<number>();
                    for (const l of lotes) {
                        const cant = Number(l.cantidad_actual);
                        const precio = Number(l.catalogo_componentes?.precio_compra || 0);
                        totalUnidades += cant;
                        valorTotal += cant * precio;
                        if (l.id_componente) skusSet.add(l.id_componente);
                    }
                    totalSkus = skusSet.size;
                }

                return {
                    id_ubicacion: b.id_ubicacion,
                    codigo_ubicacion: b.codigo_ubicacion,
                    zona: b.zona,
                    pasillo: b.pasillo,
                    estante: b.estante,
                    nivel: b.nivel,
                    activo: b.activo,
                    total_skus: totalSkus,
                    total_unidades: totalUnidades,
                    valor_total: valorTotal,
                };
            })
        );

        return resultado;
    }

    async crearBodega(dto: CrearBodegaDto) {
        const existe = await this.prisma.ubicaciones_bodega.findFirst({
            where: { codigo_ubicacion: dto.codigo_ubicacion },
        });
        if (existe) {
            throw new BadRequestException(`El código de bodega ${dto.codigo_ubicacion} ya existe`);
        }

        const nueva = await this.prisma.ubicaciones_bodega.create({
            data: {
                codigo_ubicacion: dto.codigo_ubicacion.toUpperCase().trim(),
                zona: dto.zona,
                pasillo: dto.pasillo || null,
                estante: dto.estante || null,
                nivel: dto.nivel || null,
                activo: dto.activo !== undefined ? dto.activo : true,
            },
        });

        return {
            success: true,
            mensaje: 'Bodega creada exitosamente',
            bodega: nueva,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // KARDEX HISTÓRICO INDIVIDUAL POR COMPONENTE
    // ═══════════════════════════════════════════════════════════════════════════

    async getKardex(idComponente: number, opciones?: { limit?: number; offset?: number }) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
            where: { id_componente: idComponente },
            include: { tipos_componente: true },
        });

        if (!componente) {
            throw new NotFoundException(`Componente con ID ${idComponente} no encontrado`);
        }

        const movimientos = await this.prisma.movimientos_inventario.findMany({
            where: { id_componente: idComponente },
            orderBy: { fecha_movimiento: 'desc' },
            take: opciones?.limit || 50,
            skip: opciones?.offset || 0,
            include: {
                ubicaciones_bodega: { select: { id_ubicacion: true, codigo_ubicacion: true, zona: true } },
                lotes_componentes: { select: { id_lote: true, codigo_lote: true } },
                ordenes_servicio: { select: { numero_orden: true } },
                ordenes_compra: { select: { numero_orden_compra: true } },
            },
        });

        const total = await this.prisma.movimientos_inventario.count({
            where: { id_componente: idComponente },
        });

        const userIds = [...new Set(movimientos.map((m: any) => m.realizado_por).filter(Boolean))];
        const usuarios = userIds.length > 0
            ? await this.prisma.usuarios.findMany({
                where: { id_usuario: { in: userIds } },
                include: { persona: true },
            })
            : [];
        const userMap = new Map(usuarios.map((u) => [u.id_usuario, u]));

        let saldoAcumulado = componente.stock_actual || 0;
        const kardex = movimientos.map((mov: any) => {
            const cantidad = Number(mov.cantidad);
            const user = userMap.get(mov.realizado_por);
            const nombreUsuario = this.sanitizarNombreResponsable(user);

            const resultado = {
                id_movimiento: mov.id_movimiento,
                fecha: mov.fecha_movimiento,
                tipo: mov.tipo_movimiento,
                origen: mov.origen_movimiento,
                entrada: cantidad > 0 ? cantidad : 0,
                salida: cantidad < 0 ? Math.abs(cantidad) : 0,
                saldo: saldoAcumulado,
                costo_unitario: mov.costo_unitario ? Number(mov.costo_unitario) : null,
                bodega: mov.ubicaciones_bodega?.codigo_ubicacion || 'BOD-CENTRAL',
                lote: mov.lotes_componentes?.codigo_lote || '--',
                referencia: mov.ordenes_servicio?.numero_orden ||
                    mov.ordenes_compra?.numero_orden_compra ||
                    mov.justificacion || '-',
                realizado_por: nombreUsuario,
                observaciones: mov.observaciones,
            };
            saldoAcumulado -= cantidad;
            return resultado;
        });

        return {
            componente: {
                id: componente.id_componente,
                codigo: componente.codigo_interno || `ART-${componente.id_componente}`,
                referencia: componente.referencia_fabricante,
                nombre: componente.descripcion_corta,
                marca: componente.marca,
                stock_actual: componente.stock_actual,
                stock_minimo: componente.stock_minimo,
                precio_compra: componente.precio_compra ? Number(componente.precio_compra) : null,
                precio_venta: componente.precio_venta ? Number(componente.precio_venta) : null,
                unidad: componente.unidad_medida,
            },
            kardex,
            total_movimientos: total,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETALLE LOGÍSTICO COMPLETO (FICHA EXPEDIENTE SIN ERROR 500)
    // ═══════════════════════════════════════════════════════════════════════════

    async getDetalleComponente(idComponente: number) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
            where: { id_componente: idComponente },
            include: {
                tipos_componente: true,
                categorias_componente: {
                    include: {
                        categoria_padre: true,
                    },
                },
                proveedores: {
                    include: {
                        persona: {
                            select: {
                                razon_social: true,
                                nombre_completo: true,
                                numero_identificacion: true,
                                email_principal: true,
                                telefono_principal: true,
                                celular: true,
                            },
                        },
                    },
                },
                articulos_proveedores: {
                    where: { activo: true },
                    include: {
                        proveedores: {
                            include: {
                                persona: {
                                    select: {
                                        razon_social: true,
                                        nombre_completo: true,
                                        numero_identificacion: true,
                                        email_principal: true,
                                        telefono_principal: true,
                                        celular: true,
                                    },
                                },
                            },
                        },
                        marcas: {
                            select: { nombre: true },
                        },
                    },
                    orderBy: [
                        { es_proveedor_preferido: 'desc' },
                        { costo_actual: 'asc' },
                    ],
                },
                lotes_componentes: {
                    where: { cantidad_actual: { gt: 0 } },
                    include: {
                        movimientos_inventario: {
                            take: 1,
                            orderBy: { fecha_movimiento: 'desc' },
                            include: {
                                ubicaciones_bodega: { select: { id_ubicacion: true, codigo_ubicacion: true, zona: true } },
                            },
                        },
                    },
                    orderBy: { fecha_ingreso: 'desc' },
                },
            },
        });

        if (!componente) {
            throw new NotFoundException(`Componente con ID ${idComponente} no encontrado`);
        }

        const stockActual = componente.stock_actual || 0;
        const stockMinimo = componente.stock_minimo || 0;
        let estadoStock: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' = 'OK';
        if (stockActual === 0) estadoStock = 'AGOTADO';
        else if (stockActual <= stockMinimo * 0.5 && stockMinimo > 0) estadoStock = 'CRITICO';
        else if (stockActual <= stockMinimo && stockMinimo > 0) estadoStock = 'BAJO';

        const precioCompra = componente.precio_compra ? Number(componente.precio_compra) : 0;
        const valorStock = stockActual * precioCompra;

        const [totalMovimientos, ultimosMovimientos] = await Promise.all([
            this.prisma.movimientos_inventario.count({ where: { id_componente: idComponente } }),
            this.prisma.movimientos_inventario.findMany({
                where: { id_componente: idComponente },
                orderBy: { fecha_movimiento: 'desc' },
                take: 10,
                include: {
                    ubicaciones_bodega: { select: { id_ubicacion: true, codigo_ubicacion: true, zona: true } },
                    lotes_componentes: { select: { id_lote: true, codigo_lote: true } },
                },
            }),
        ]);

        const userIdsMovs = [...new Set(ultimosMovimientos.map((m: any) => m.realizado_por).filter(Boolean))];
        const usuariosMovs = userIdsMovs.length > 0
            ? await this.prisma.usuarios.findMany({
                where: { id_usuario: { in: userIdsMovs } },
                include: { persona: true },
            })
            : [];
        const userMapMovs = new Map(usuariosMovs.map((u) => [u.id_usuario, u]));

        const comp = componente as any;

        const proveedoresHomologados = (componente.articulos_proveedores || []).map((ap: any) => ({
            id_proveedor: ap.id_proveedor,
            nombre_proveedor: ap.proveedores?.persona?.razon_social || ap.proveedores?.persona?.nombre_completo || `Proveedor #${ap.id_proveedor}`,
            nit: ap.proveedores?.persona?.numero_identificacion || '--',
            referencia_proveedor: ap.referencia_proveedor || '--',
            marca_ofrecida: ap.marcas?.nombre || ap.marca_ofrecida || '--',
            costo_actual: Number(ap.costo_actual || 0),
            moneda: ap.moneda || 'COP',
            tiempo_entrega_dias: ap.tiempo_entrega_dias ?? 1,
            cantidad_minima_compra: Number(ap.cantidad_minima_compra || 1),
            es_proveedor_preferido: ap.es_proveedor_preferido || false,
            telefono: ap.proveedores?.persona?.telefono_principal || ap.proveedores?.persona?.celular || '--',
            email: ap.proveedores?.persona?.email_principal || '--',
        }));

        const provPrincipal = comp.proveedores ? {
            id: comp.proveedores.id_proveedor,
            nombre: comp.proveedores.persona?.razon_social || comp.proveedores.persona?.nombre_completo,
            nit: comp.proveedores.persona?.numero_identificacion,
            telefono: comp.proveedores.persona?.telefono_principal || comp.proveedores.persona?.celular,
            email: comp.proveedores.persona?.email_principal,
        } : (proveedoresHomologados.length > 0 ? {
            id: proveedoresHomologados[0].id_proveedor,
            nombre: proveedoresHomologados[0].nombre_proveedor,
            nit: proveedoresHomologados[0].nit,
            telefono: proveedoresHomologados[0].telefono,
            email: proveedoresHomologados[0].email,
        } : null);

        const catPadre = (componente.categorias_componente as any)?.categoria_padre?.nombre;
        const catNombre = componente.categorias_componente?.nombre;
        const catTexto = catNombre || 'General';
        const catCompleta = catPadre ? `${catPadre} > ${catNombre}` : catTexto;

        return {
            id: componente.id_componente,
            id_componente: componente.id_componente,
            codigo_interno: componente.codigo_interno || `ART-${componente.id_componente}`,
            referencia_fabricante: componente.referencia_fabricante,
            descripcion_corta: componente.descripcion_corta,
            descripcion_detallada: componente.descripcion_detallada,
            marca: componente.marca,
            activo: componente.activo,

            tipo: {
                id: comp.categorias_componente?.id_categoria || comp.tipos_componente?.id_tipo_componente,
                nombre: catTexto,
                codigo: comp.categorias_componente?.codigo_categoria || comp.tipos_componente?.codigo_tipo,
                padre: catPadre || null,
                completo: catCompleta,
            },
            categoria: {
                id: comp.categorias_componente?.id_categoria,
                nombre: catTexto,
                codigo: comp.categorias_componente?.codigo_categoria,
                padre: catPadre || null,
                completo: catCompleta,
            },

            especificaciones_tecnicas: componente.especificaciones_tecnicas,
            unidad_medida: componente.unidad_medida || 'UND',
            observaciones: componente.observaciones,

            stock: {
                actual: stockActual,
                minimo: stockMinimo,
                estado: estadoStock,
                valor_total: valorStock,
                es_inventariable: componente.es_inventariable,
            },

            precios: {
                compra: precioCompra,
                venta: componente.precio_venta ? Number(componente.precio_venta) : null,
                moneda: componente.moneda || 'COP',
            },

            proveedor: provPrincipal,
            proveedores_homologados: proveedoresHomologados,

            bodegas: (() => {
                const bMap = new Map<number, { id_ubicacion: number; codigo: string; nombre: string; stock: number }>();
                for (const l of (componente.lotes_componentes || [])) {
                    const ub = l.movimientos_inventario?.[0]?.ubicaciones_bodega;
                    const idU = ub?.id_ubicacion || 1;
                    const cod = ub?.codigo_ubicacion || 'BOD-CENTRAL';
                    const nom = ub?.zona || 'Bodega Central Taller';
                    const exist = bMap.get(idU) || { id_ubicacion: idU, codigo: cod, nombre: nom, stock: 0 };
                    exist.stock += Number(l.cantidad_actual || 0);
                    bMap.set(idU, exist);
                }
                if (bMap.size === 0 && stockActual > 0) {
                    bMap.set(1, { id_ubicacion: 1, codigo: 'BOD-CENTRAL', nombre: 'Bodega Central Taller', stock: stockActual });
                }
                return Array.from(bMap.values());
            })(),

            lotes_activos: (componente.lotes_componentes || []).map((l: any) => {
                const ub = l.movimientos_inventario?.[0]?.ubicaciones_bodega;
                const idU = ub?.id_ubicacion || 1;
                const cod = ub?.codigo_ubicacion || 'BOD-CENTRAL';
                const nom = ub?.zona || 'Bodega Central Taller';
                return {
                    id_lote: l.id_lote,
                    codigo_lote: l.codigo_lote,
                    numero_lote_fabricante: l.numero_factura_proveedor,
                    cantidad_inicial: Number(l.cantidad_inicial),
                    cantidad_actual: Number(l.cantidad_actual),
                    fecha_vencimiento: l.fecha_vencimiento,
                    estado_lote: l.estado_lote,
                    fecha_ingreso: l.fecha_ingreso,
                    id_ubicacion: idU,
                    bodega: cod,
                    zona: nom,
                    bodega_codigo: cod,
                    bodega_nombre: nom,
                };
            }),

            ultimos_movimientos: ultimosMovimientos.map((m: any) => {
                const u = userMapMovs.get(m.realizado_por);
                return {
                    id_movimiento: m.id_movimiento,
                    fecha: m.fecha_movimiento,
                    tipo: m.tipo_movimiento,
                    origen: m.origen_movimiento,
                    cantidad: Number(m.cantidad),
                    costo_unitario: m.costo_unitario ? Number(m.costo_unitario) : null,
                    bodega: m.ubicaciones_bodega?.codigo_ubicacion || 'BOD-CENTRAL',
                    lote: m.lotes_componentes?.codigo_lote || '--',
                    justificacion: m.justificacion,
                    realizado_por: this.sanitizarNombreResponsable(u),
                };
            }),

            metricas: {
                total_movimientos: totalMovimientos,
                alertas_activas: stockActual <= stockMinimo && stockMinimo > 0 ? 1 : 0,
                lotes_activos_count: (componente.lotes_componentes || []).length,
            },

            auditoria: {
                fecha_creacion: componente.fecha_creacion,
                creado_por: 'Administrador del Sistema',
                fecha_modificacion: componente.fecha_modificacion,
                modificado_por: 'Administrador del Sistema',
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTUALIZAR COMPONENTE (CRUD MAESTRO)
    // ═══════════════════════════════════════════════════════════════════════════

    async actualizarComponente(idComponente: number, dto: ActualizarComponenteDto) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
            where: { id_componente: idComponente },
        });

        if (!componente) {
            throw new NotFoundException(`Componente con ID ${idComponente} no encontrado`);
        }

        const updateData: any = {
            fecha_modificacion: new Date(),
            modificado_por: dto.modificado_por || 1,
        };

        if (dto.codigo_interno !== undefined) updateData.codigo_interno = dto.codigo_interno;
        if (dto.referencia_fabricante !== undefined) updateData.referencia_fabricante = dto.referencia_fabricante;
        if (dto.descripcion_corta !== undefined) updateData.descripcion_corta = dto.descripcion_corta;
        if (dto.descripcion_detallada !== undefined) updateData.descripcion_detallada = dto.descripcion_detallada;
        if (dto.marca !== undefined) updateData.marca = dto.marca;
        if (dto.id_tipo_componente !== undefined) updateData.id_tipo_componente = dto.id_tipo_componente;
        if (dto.tipo_comercial !== undefined) updateData.tipo_comercial = dto.tipo_comercial;
        if (dto.unidad_medida !== undefined) updateData.unidad_medida = dto.unidad_medida;
        if (dto.stock_minimo !== undefined) updateData.stock_minimo = dto.stock_minimo;
        if (dto.precio_compra !== undefined) updateData.precio_compra = dto.precio_compra;
        if (dto.precio_venta !== undefined) updateData.precio_venta = dto.precio_venta;
        if (dto.id_proveedor_principal !== undefined) updateData.id_proveedor_principal = dto.id_proveedor_principal;
        if (dto.observaciones !== undefined) updateData.observaciones = dto.observaciones;
        if (dto.notas_instalacion !== undefined) updateData.notas_instalacion = dto.notas_instalacion;
        if (dto.especificaciones_tecnicas !== undefined) updateData.especificaciones_tecnicas = dto.especificaciones_tecnicas;
        if (dto.es_inventariable !== undefined) updateData.es_inventariable = dto.es_inventariable;
        if (dto.activo !== undefined) updateData.activo = dto.activo;
        if (dto.reemplazado_por !== undefined) updateData.reemplazado_por = dto.reemplazado_por;
        if (dto.componentes_compatibles !== undefined) updateData.componentes_compatibles = dto.componentes_compatibles;

        const actualizado = await this.prisma.catalogo_componentes.update({
            where: { id_componente: idComponente },
            data: updateData,
        });

        return {
            success: true,
            message: 'Componente actualizado correctamente',
            componente: actualizado,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CATÁLOGOS AUXILIARES
    // ═══════════════════════════════════════════════════════════════════════════

    async getTiposComponente() {
        return this.prisma.tipos_componente.findMany({
            where: { activo: true },
            orderBy: { nombre_componente: 'asc' },
            select: {
                id_tipo_componente: true,
                codigo_tipo: true,
                nombre_componente: true,
            },
        });
    }

    async getProveedores() {
        const proveedores = await this.prisma.proveedores.findMany({
            where: { proveedor_activo: true },
            include: {
                persona: {
                    select: {
                        razon_social: true,
                        nombre_completo: true,
                        numero_identificacion: true,
                    },
                },
            },
        });

        return proveedores.map(p => ({
            id: p.id_proveedor,
            nit: (p as any).persona?.numero_identificacion,
            nombre: (p as any).persona?.razon_social || (p as any).persona?.nombre_completo,
        }));
    }

    async getMotivosAjuste() {
        return this.prisma.motivos_ajuste.findMany({
            where: { activo: true },
            orderBy: { id_motivo_ajuste: 'asc' },
        });
    }

    async getAlertasStock(estado?: string) {
        const where: any = {};
        if (estado) {
            where.estado = estado;
        } else {
            where.estado = { in: ['PENDIENTE', 'VISTA', 'EN_PROCESO'] };
        }

        return this.prisma.alertas_stock.findMany({
            where,
            include: {
                catalogo_componentes: {
                    select: {
                        codigo_interno: true,
                        descripcion_corta: true,
                        stock_actual: true,
                        stock_minimo: true,
                    },
                },
            },
            orderBy: { fecha_creacion: 'desc' },
            take: 50,
        });
    }

    async resolverAlerta(idAlerta: number, usuarioId: number, observaciones?: string) {
        return this.prisma.alertas_stock.update({
            where: { id_alerta: idAlerta },
            data: {
                estado: 'RESUELTA',
                resuelto_por: usuarioId,
                fecha_resolucion: new Date(),
                observaciones: observaciones || 'Resuelta desde el panel de inventario',
            },
        });
    }
}
