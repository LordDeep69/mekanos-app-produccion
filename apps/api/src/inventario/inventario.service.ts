// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO SERVICE - MOTOR TRANSACCIONAL ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════════
// Principio: El inventario es dinero. Cada movimiento es atómico y auditable.
// Autor: Agente IA Líder Técnico
// Fecha: 27-Dic-2025
// ═══════════════════════════════════════════════════════════════════════════════

import {
    BadRequestException,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS Y ENUMS
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
    observaciones?: string;
    realizado_por: number;
}

export interface SalidaInventarioDto {
    id_componente: number;
    cantidad: number;
    id_orden_servicio?: number;
    id_remision?: number;
    id_tecnico?: number;
    observaciones?: string;
    realizado_por: number;
}

export interface AjusteInventarioDto {
    id_componente: number;
    cantidad_nueva: number;
    motivo: 'CONTEO_FISICO' | 'MERMA' | 'CORRECCION_ERROR';
    justificacion: string;
    realizado_por: number;
    aprobado_por?: number;
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
    modificado_por: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICIO PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class InventarioService {
    constructor(private readonly prisma: PrismaService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    // MÉTODO MAESTRO: REGISTRAR MOVIMIENTO (TRANSACCIONAL)
    // ═══════════════════════════════════════════════════════════════════════════

    async registrarMovimiento(dto: RegistrarMovimientoDto) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Verificar que el componente existe
            const componente = await tx.catalogo_componentes.findUnique({
                where: { id_componente: dto.id_componente },
            });

            if (!componente) {
                throw new NotFoundException(
                    `Componente con ID ${dto.id_componente} no encontrado`,
                );
            }

            const stockActual = componente.stock_actual || 0;
            let nuevoStock: number;
            let cantidadMovimiento = Math.abs(dto.cantidad);

            // 2. Calcular nuevo stock según tipo de movimiento
            switch (dto.tipo_movimiento) {
                case TipoMovimiento.ENTRADA:
                    nuevoStock = stockActual + cantidadMovimiento;
                    break;

                case TipoMovimiento.SALIDA:
                    // VALIDACIÓN CRÍTICA: No permitir stock negativo
                    if (stockActual < cantidadMovimiento) {
                        throw new BadRequestException(
                            `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidadMovimiento}`,
                        );
                    }
                    nuevoStock = stockActual - cantidadMovimiento;
                    // Para movimientos de salida, la cantidad se registra como negativa
                    cantidadMovimiento = -cantidadMovimiento;
                    break;

                case TipoMovimiento.AJUSTE:
                    // El ajuste puede ser positivo o negativo
                    nuevoStock = stockActual + dto.cantidad;
                    if (nuevoStock < 0) {
                        throw new BadRequestException(
                            `Ajuste resultaría en stock negativo: ${nuevoStock}`,
                        );
                    }
                    cantidadMovimiento = dto.cantidad;
                    break;

                case TipoMovimiento.TRANSFERENCIA:
                    // Transferencia no afecta stock total (cambia ubicación)
                    nuevoStock = stockActual;
                    break;

                default:
                    throw new BadRequestException(
                        `Tipo de movimiento no válido: ${dto.tipo_movimiento}`,
                    );
            }

            // 3. Crear el registro de movimiento
            const movimiento = await tx.movimientos_inventario.create({
                data: {
                    tipo_movimiento: dto.tipo_movimiento as any,
                    origen_movimiento: dto.origen_movimiento as any,
                    id_componente: dto.id_componente,
                    cantidad: new Decimal(cantidadMovimiento),
                    costo_unitario: dto.costo_unitario
                        ? new Decimal(dto.costo_unitario)
                        : null,
                    id_ubicacion: dto.id_ubicacion,
                    id_lote: dto.id_lote,
                    id_orden_servicio: dto.id_orden_servicio,
                    id_orden_compra: dto.id_orden_compra,
                    id_remision: dto.id_remision,
                    justificacion: dto.justificacion,
                    observaciones: dto.observaciones,
                    realizado_por: dto.realizado_por,
                    aprobado_por: dto.aprobado_por,
                    fecha_movimiento: new Date(),
                },
            });

            // 4. Actualizar stock en catálogo
            await tx.catalogo_componentes.update({
                where: { id_componente: dto.id_componente },
                data: {
                    stock_actual: nuevoStock,
                    fecha_modificacion: new Date(),
                    modificado_por: dto.realizado_por,
                },
            });

            // 5. Recalcular Costo Promedio Ponderado (CPP) si es entrada con costo
            if (
                dto.tipo_movimiento === TipoMovimiento.ENTRADA &&
                dto.costo_unitario &&
                dto.costo_unitario > 0
            ) {
                const costoAnterior = Number(componente.precio_compra || 0);
                const cantidadAnterior = stockActual;
                const cantidadNueva = Math.abs(dto.cantidad);
                const costoNuevo = dto.costo_unitario;

                // CPP = (CostoAnterior * CantidadAnterior + CostoNuevo * CantidadNueva) / StockTotal
                const valorAnterior = costoAnterior * cantidadAnterior;
                const valorNuevo = costoNuevo * cantidadNueva;
                const cpp =
                    nuevoStock > 0 ? (valorAnterior + valorNuevo) / nuevoStock : costoNuevo;

                await tx.catalogo_componentes.update({
                    where: { id_componente: dto.id_componente },
                    data: {
                        precio_compra: new Decimal(cpp.toFixed(2)),
                    },
                });
            }

            // 6. Verificar si debe generar alerta de stock bajo
            const stockMinimo = componente.stock_minimo || 0;
            if (nuevoStock <= stockMinimo && nuevoStock >= 0) {
                // Verificar si ya existe alerta pendiente
                const alertaExistente = await tx.alertas_stock.findFirst({
                    where: {
                        id_componente: dto.id_componente,
                        tipo_alerta: 'STOCK_MINIMO',
                        estado: { in: ['PENDIENTE', 'VISTA', 'EN_PROCESO'] },
                    },
                });

                if (!alertaExistente) {
                    await tx.alertas_stock.create({
                        data: {
                            tipo_alerta: 'STOCK_MINIMO',
                            nivel: nuevoStock === 0 ? 'CRITICO' : 'ADVERTENCIA',
                            id_componente: dto.id_componente,
                            mensaje: `Stock bajo: ${nuevoStock} unidades (mínimo: ${stockMinimo})`,
                            estado: 'PENDIENTE',
                        },
                    });
                }
            }

            return {
                success: true,
                movimiento: {
                    id_movimiento: movimiento.id_movimiento,
                    tipo: dto.tipo_movimiento,
                    origen: dto.origen_movimiento,
                    cantidad: Math.abs(dto.cantidad),
                    fecha: movimiento.fecha_movimiento,
                },
                componente: {
                    id_componente: dto.id_componente,
                    codigo: componente.codigo_interno,
                    nombre: componente.descripcion_corta,
                    stock_anterior: stockActual,
                    stock_actual: nuevoStock,
                    diferencia: nuevoStock - stockActual,
                },
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENTRADA DE INVENTARIO (COMPRA/DEVOLUCIÓN)
    // ═══════════════════════════════════════════════════════════════════════════

    async registrarEntrada(dto: EntradaInventarioDto) {
        if (dto.cantidad <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        if (dto.costo_unitario < 0) {
            throw new BadRequestException('El costo unitario no puede ser negativo');
        }

        return this.registrarMovimiento({
            tipo_movimiento: TipoMovimiento.ENTRADA,
            origen_movimiento: dto.id_orden_compra
                ? OrigenMovimiento.COMPRA
                : OrigenMovimiento.INVENTARIO_INICIAL,
            id_componente: dto.id_componente,
            cantidad: dto.cantidad,
            costo_unitario: dto.costo_unitario,
            id_ubicacion: dto.id_ubicacion,
            id_orden_compra: dto.id_orden_compra,
            observaciones: dto.observaciones,
            realizado_por: dto.realizado_por,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SALIDA DE INVENTARIO (CONSUMO/DESPACHO)
    // ═══════════════════════════════════════════════════════════════════════════

    async registrarSalida(dto: SalidaInventarioDto) {
        if (dto.cantidad <= 0) {
            throw new BadRequestException('La cantidad debe ser mayor a 0');
        }

        return this.registrarMovimiento({
            tipo_movimiento: TipoMovimiento.SALIDA,
            origen_movimiento: dto.id_orden_servicio
                ? OrigenMovimiento.CONSUMO_OS
                : OrigenMovimiento.REMISION,
            id_componente: dto.id_componente,
            cantidad: dto.cantidad,
            id_orden_servicio: dto.id_orden_servicio,
            id_remision: dto.id_remision,
            observaciones: dto.observaciones,
            realizado_por: dto.realizado_por,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AJUSTE DE INVENTARIO (CONTEO FÍSICO/MERMA)
    // ═══════════════════════════════════════════════════════════════════════════

    async registrarAjuste(dto: AjusteInventarioDto) {
        // Obtener stock actual
        const componente = await this.prisma.catalogo_componentes.findUnique({
            where: { id_componente: dto.id_componente },
        });

        if (!componente) {
            throw new NotFoundException(
                `Componente con ID ${dto.id_componente} no encontrado`,
            );
        }

        const stockActual = componente.stock_actual || 0;
        const diferencia = dto.cantidad_nueva - stockActual;

        if (diferencia === 0) {
            return {
                success: true,
                mensaje: 'El stock ya coincide con la cantidad indicada',
                stock_actual: stockActual,
            };
        }

        return this.registrarMovimiento({
            tipo_movimiento: TipoMovimiento.AJUSTE,
            origen_movimiento: dto.motivo as OrigenMovimiento,
            id_componente: dto.id_componente,
            cantidad: diferencia,
            justificacion: dto.justificacion,
            realizado_por: dto.realizado_por,
            aprobado_por: dto.aprobado_por,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // KARDEX: HISTORIAL DE MOVIMIENTOS POR COMPONENTE
    // ═══════════════════════════════════════════════════════════════════════════

    async getKardex(idComponente: number, opciones?: { limit?: number; offset?: number }) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
            where: { id_componente: idComponente },
            include: {
                tipos_componente: true,
            },
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
                usuarios_movimientos_inventario_realizado_porTousuarios: {
                    include: {
                        persona: true,
                    },
                },
                ordenes_servicio: {
                    select: {
                        numero_orden: true,
                    },
                },
                ordenes_compra: {
                    select: {
                        numero_orden_compra: true,
                    },
                },
            },
        });

        const total = await this.prisma.movimientos_inventario.count({
            where: { id_componente: idComponente },
        });

        // Calcular saldo acumulado (balance running)
        let saldoAcumulado = componente.stock_actual || 0;
        const kardex = movimientos.map((mov: any) => {
            const cantidad = Number(mov.cantidad);
            const resultado = {
                id_movimiento: mov.id_movimiento,
                fecha: mov.fecha_movimiento,
                tipo: mov.tipo_movimiento,
                origen: mov.origen_movimiento,
                entrada: cantidad > 0 ? cantidad : 0,
                salida: cantidad < 0 ? Math.abs(cantidad) : 0,
                saldo: saldoAcumulado,
                costo_unitario: mov.costo_unitario ? Number(mov.costo_unitario) : null,
                referencia: mov.ordenes_servicio?.numero_orden ||
                    mov.ordenes_compra?.numero_orden_compra ||
                    mov.justificacion || '-',
                realizado_por: mov.usuarios_movimientos_inventario_realizado_porTousuarios?.persona
                    ? `${mov.usuarios_movimientos_inventario_realizado_porTousuarios.persona.primer_nombre} ${mov.usuarios_movimientos_inventario_realizado_porTousuarios.persona.primer_apellido}`
                    : 'Sistema',
                observaciones: mov.observaciones,
            };
            // Restar para el movimiento anterior (reconstrucción inversa)
            saldoAcumulado -= cantidad;
            return resultado;
        });

        return {
            componente: {
                id: componente.id_componente,
                codigo: componente.codigo_interno,
                referencia: componente.referencia_fabricante,
                nombre: componente.descripcion_corta,
                marca: componente.marca,
                tipo: (componente.tipos_componente as any)?.nombre_tipo || componente.tipos_componente?.nombre_componente,
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
    // DASHBOARD KPIs
    // ═══════════════════════════════════════════════════════════════════════════

    async getDashboardKPIs() {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Ejecutar todas las consultas en paralelo
        const [
            valorInventario,
            totalItems,
            itemsCriticos,
            movimientosHoy,
            alertasPendientes,
            topMovimientos,
        ] = await Promise.all([
            // Valor total del inventario (Stock * Precio Compra)
            this.prisma.$queryRaw<[{ valor: number }]>`
        SELECT COALESCE(SUM(stock_actual * COALESCE(precio_compra, 0)), 0)::numeric as valor
        FROM catalogo_componentes
        WHERE activo = true AND es_inventariable = true
      `,

            // Total de items con stock
            this.prisma.catalogo_componentes.count({
                where: { activo: true, es_inventariable: true },
            }),

            // Items con stock crítico (stock <= stock_minimo)
            this.prisma.catalogo_componentes.count({
                where: {
                    activo: true,
                    es_inventariable: true,
                    OR: [
                        { stock_actual: { lte: this.prisma.catalogo_componentes.fields.stock_minimo } },
                        { stock_actual: 0 },
                    ],
                },
            }),

            // Movimientos de hoy
            this.prisma.movimientos_inventario.count({
                where: {
                    fecha_movimiento: { gte: hoy },
                },
            }),

            // Alertas pendientes
            this.prisma.alertas_stock.count({
                where: {
                    estado: { in: ['PENDIENTE', 'VISTA'] },
                },
            }),

            // Top 5 componentes con más movimientos este mes
            this.prisma.movimientos_inventario.groupBy({
                by: ['id_componente'],
                _count: { id_movimiento: true },
                where: {
                    fecha_movimiento: {
                        gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
                    },
                },
                orderBy: { _count: { id_movimiento: 'desc' } },
                take: 5,
            }),
        ]);

        return {
            kpis: {
                valor_inventario: Number(valorInventario[0]?.valor || 0),
                total_items: totalItems,
                items_criticos: itemsCriticos,
                movimientos_hoy: movimientosHoy,
                alertas_pendientes: alertasPendientes,
            },
            top_movimientos: topMovimientos,
            fecha_consulta: new Date(),
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LISTAR COMPONENTES CON STOCK
    // ═══════════════════════════════════════════════════════════════════════════

    async listarComponentesConStock(filtros?: {
        busqueda?: string;
        id_tipo?: number;
        solo_criticos?: boolean;
        solo_activos?: boolean;
        skip?: number;
        limit?: number;
    }) {
        const where: any = {
            es_inventariable: true,
        };

        if (filtros?.solo_activos !== false) {
            where.activo = true;
        }

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

        if (filtros?.solo_criticos) {
            where.stock_actual = { lte: this.prisma.catalogo_componentes.fields.stock_minimo };
        }

        const [data, total] = await Promise.all([
            this.prisma.catalogo_componentes.findMany({
                where,
                include: {
                    tipos_componente: true,
                },
                orderBy: [
                    { stock_actual: 'asc' },
                    { descripcion_corta: 'asc' },
                ],
                skip: filtros?.skip || 0,
                take: filtros?.limit || 50,
            }),
            this.prisma.catalogo_componentes.count({ where }),
        ]);

        return {
            data: data.map((c) => ({
                id_componente: c.id_componente,
                codigo: c.codigo_interno,
                referencia: c.referencia_fabricante,
                nombre: c.descripcion_corta,
                marca: c.marca,
                tipo: (c.tipos_componente as any)?.nombre_tipo || c.tipos_componente?.nombre_componente,
                stock_actual: c.stock_actual || 0,
                stock_minimo: c.stock_minimo || 0,
                estado_stock:
                    (c.stock_actual || 0) === 0
                        ? 'AGOTADO'
                        : (c.stock_actual || 0) <= (c.stock_minimo || 0)
                            ? 'CRITICO'
                            : (c.stock_actual || 0) <= (c.stock_minimo || 0) * 1.5
                                ? 'BAJO'
                                : 'OK',
                precio_compra: c.precio_compra ? Number(c.precio_compra) : null,
                precio_venta: c.precio_venta ? Number(c.precio_venta) : null,
                valor_stock: c.precio_compra
                    ? Number(c.precio_compra) * (c.stock_actual || 0)
                    : 0,
                unidad: c.unidad_medida,
                activo: c.activo,
            })),
            meta: {
                total,
                skip: filtros?.skip || 0,
                limit: filtros?.limit || 50,
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ALERTAS DE STOCK
    // ═══════════════════════════════════════════════════════════════════════════

    async getAlertasStock(estado?: string) {
        const where: any = {};

        if (estado) {
            where.estado = estado;
        } else {
            where.estado = { in: ['PENDIENTE', 'VISTA', 'EN_PROCESO'] };
        }

        const alertas = await this.prisma.alertas_stock.findMany({
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
                lotes_componentes: {
                    select: {
                        codigo_lote: true,
                        fecha_vencimiento: true,
                    },
                },
            },
            orderBy: [
                { nivel: 'asc' }, // CRITICO primero
                { fecha_generacion: 'desc' },
            ],
        });

        return alertas;
    }

    async resolverAlerta(idAlerta: number, usuarioId: number, observaciones?: string) {
        const alerta = await this.prisma.alertas_stock.findUnique({
            where: { id_alerta: idAlerta },
        });

        if (!alerta) {
            throw new NotFoundException(`Alerta con ID ${idAlerta} no encontrada`);
        }

        return this.prisma.alertas_stock.update({
            where: { id_alerta: idAlerta },
            data: {
                estado: 'RESUELTA',
                fecha_resolucion: new Date(),
                resuelto_por: usuarioId,
                observaciones: observaciones || alerta.observaciones,
            },
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETALLE COMPLETO DEL COMPONENTE (VISTA MAESTRA)
    // ═══════════════════════════════════════════════════════════════════════════

    async getDetalleComponente(idComponente: number) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
            where: { id_componente: idComponente },
            include: {
                tipos_componente: true,
                proveedores: {
                    include: {
                        persona: {
                            select: {
                                nombre_completo: true,
                                razon_social: true,
                                numero_identificacion: true,
                                email_principal: true,
                                telefono_principal: true,
                                celular: true,
                            },
                        },
                    },
                },
                usuarios_catalogo_componentes_creado_porTousuarios: {
                    include: { persona: { select: { primer_nombre: true, primer_apellido: true } } },
                },
                usuarios_catalogo_componentes_modificado_porTousuarios: {
                    include: { persona: { select: { primer_nombre: true, primer_apellido: true } } },
                },
                catalogo_componentes: {
                    select: { id_componente: true, codigo_interno: true, descripcion_corta: true },
                },
            },
        });

        if (!componente) {
            throw new NotFoundException(`Componente con ID ${idComponente} no encontrado`);
        }

        // Calcular estado del stock
        const stockActual = componente.stock_actual || 0;
        const stockMinimo = componente.stock_minimo || 0;
        let estadoStock: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' = 'OK';
        if (stockActual === 0) estadoStock = 'AGOTADO';
        else if (stockActual <= stockMinimo * 0.5) estadoStock = 'CRITICO';
        else if (stockActual <= stockMinimo) estadoStock = 'BAJO';

        // Calcular valor del stock
        const precioCompra = componente.precio_compra ? Number(componente.precio_compra) : 0;
        const valorStock = stockActual * precioCompra;

        // Obtener últimos movimientos para resumen
        const ultimosMovimientos = await this.prisma.movimientos_inventario.count({
            where: { id_componente: idComponente },
        });

        // Obtener alertas activas
        const alertasActivas = await this.prisma.alertas_stock.count({
            where: {
                id_componente: idComponente,
                estado: { in: ['PENDIENTE', 'VISTA'] },
            },
        });

        // Cast a any para acceder a relaciones incluidas
        const comp = componente as any;
        const creador = comp.usuarios_catalogo_componentes_creado_porTousuarios;
        const modificador = comp.usuarios_catalogo_componentes_modificado_porTousuarios;

        return {
            // Datos principales
            id_componente: componente.id_componente,
            codigo_interno: componente.codigo_interno,
            referencia_fabricante: componente.referencia_fabricante,
            descripcion_corta: componente.descripcion_corta,
            descripcion_detallada: componente.descripcion_detallada,
            marca: componente.marca,
            activo: componente.activo,

            // Tipo y categoría
            tipo: {
                id: comp.tipos_componente?.id_tipo_componente,
                nombre: comp.tipos_componente?.nombre_tipo || comp.tipos_componente?.nombre_componente,
                codigo: comp.tipos_componente?.codigo_tipo,
            },
            tipo_comercial: componente.tipo_comercial,

            // Especificaciones
            especificaciones_tecnicas: componente.especificaciones_tecnicas,
            unidad_medida: componente.unidad_medida,
            observaciones: componente.observaciones,
            notas_instalacion: componente.notas_instalacion,

            // Stock y estado
            stock: {
                actual: stockActual,
                minimo: stockMinimo,
                estado: estadoStock,
                valor_total: valorStock,
                es_inventariable: componente.es_inventariable,
            },

            // Precios y costos
            precios: {
                compra: precioCompra,
                venta: componente.precio_venta ? Number(componente.precio_venta) : null,
                moneda: componente.moneda,
                margen_utilidad: componente.margen_utilidad_porcentaje
                    ? Number(componente.margen_utilidad_porcentaje)
                    : null,
                ventana_costo_meses: componente.ventana_costo_meses,
            },

            // Proveedor principal
            proveedor: comp.proveedores ? {
                id: comp.proveedores.id_proveedor,
                nombre: comp.proveedores.persona.razon_social || comp.proveedores.persona.nombre_completo,
                nit: comp.proveedores.persona.numero_identificacion,
                contacto: comp.proveedores.persona.nombre_completo,
                telefono: comp.proveedores.persona.telefono_principal || comp.proveedores.persona.celular,
                email: comp.proveedores.persona.email_principal,
            } : null,

            // Componente que lo reemplaza
            reemplazado_por: comp.catalogo_componentes ? {
                id: comp.catalogo_componentes.id_componente,
                codigo: comp.catalogo_componentes.codigo_interno,
                nombre: comp.catalogo_componentes.descripcion_corta,
            } : null,

            // Componentes compatibles (IDs)
            componentes_compatibles: componente.componentes_compatibles || [],

            // Métricas
            metricas: {
                total_movimientos: ultimosMovimientos,
                alertas_activas: alertasActivas,
            },

            // Auditoría
            auditoria: {
                fecha_creacion: componente.fecha_creacion,
                creado_por: creador?.persona
                    ? `${creador.persona.primer_nombre} ${creador.persona.primer_apellido}`
                    : null,
                fecha_modificacion: componente.fecha_modificacion,
                modificado_por: modificador?.persona
                    ? `${modificador.persona.primer_nombre} ${modificador.persona.primer_apellido}`
                    : null,
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

        // Construir objeto de actualización solo con campos proporcionados
        const updateData: any = {
            fecha_modificacion: new Date(),
            modificado_por: dto.modificado_por,
        };

        // Campos editables
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
            include: {
                tipos_componente: true,
                proveedores: { include: { persona: { select: { razon_social: true, nombre_completo: true } } } },
            },
        });

        return {
            success: true,
            message: 'Componente actualizado correctamente',
            componente: {
                id_componente: actualizado.id_componente,
                codigo_interno: actualizado.codigo_interno,
                referencia_fabricante: actualizado.referencia_fabricante,
                descripcion_corta: actualizado.descripcion_corta,
                marca: actualizado.marca,
                stock_actual: actualizado.stock_actual,
                stock_minimo: actualizado.stock_minimo,
                precio_compra: actualizado.precio_compra ? Number(actualizado.precio_compra) : null,
                precio_venta: actualizado.precio_venta ? Number(actualizado.precio_venta) : null,
                activo: actualizado.activo,
            },
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OBTENER TIPOS DE COMPONENTE (PARA SELECTORES)
    // ═══════════════════════════════════════════════════════════════════════════

    async getTiposComponente() {
        const tipos = await this.prisma.tipos_componente.findMany({
            where: { activo: true },
            orderBy: { nombre_componente: 'asc' },
            select: {
                id_tipo_componente: true,
                codigo_tipo: true,
                nombre_componente: true,
            },
        });

        return tipos.map(t => ({
            id: t.id_tipo_componente,
            codigo: t.codigo_tipo,
            nombre: t.nombre_componente,
        }));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OBTENER PROVEEDORES (PARA SELECTORES)
    // ═══════════════════════════════════════════════════════════════════════════

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

        return proveedores.map(p => {
            const pers = (p as any).persona;
            return {
                id: p.id_proveedor,
                nit: pers.numero_identificacion,
                nombre: pers.razon_social || pers.nombre_completo,
            };
        });
    }
}
