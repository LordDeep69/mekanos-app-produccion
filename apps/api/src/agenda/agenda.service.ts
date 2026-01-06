/**
 * MEKANOS S.A.S - API Backend
 * Servicio Enterprise de Agenda
 * 
 * Proporciona lógica de negocio inteligente para:
 * - Cronogramas de servicios programados
 * - Alertas de vencimientos
 * - Carga de trabajo por técnico
 * - Métricas y KPIs de agenda
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

// Interfaces para tipado enterprise
export interface AgendaFilters {
    fechaDesde?: string;
    fechaHasta?: string;
    clienteId?: number;
    tecnicoId?: number;
    tipoServicioId?: number;
    estado?: string;
    prioridad?: string;
    zonaGeografica?: string;
}

export interface ServicioProgramado {
    id_cronograma: number;
    fecha_prevista: Date;
    fecha_inicio_ventana: Date | null;
    fecha_fin_ventana: Date | null;
    estado_cronograma: string;
    prioridad: string;
    dias_restantes: number;
    nivel_urgencia: 'CRITICA' | 'ALTA' | 'MEDIA' | 'NORMAL';

    // Relaciones expandidas
    cliente: {
        id: number;
        nombre: string;
        codigo: string;
    };
    equipo: {
        id: number;
        codigo: string;
        nombre_tipo: string;
        sede?: string;
        zona?: string;
    };
    tipo_servicio: {
        id: number;
        nombre: string;
        codigo: string;
    };
    contrato: {
        id: number;
        codigo: string;
    };
    tecnico_asignado?: {
        id: number;
        nombre: string;
    };
    orden_servicio?: {
        id: number;
        numero: string;
        estado: string;
    };
}

export interface AgendaMetricas {
    total_programados: number;
    servicios_hoy: number;
    servicios_semana: number;
    servicios_mes: number;
    vencidos: number;
    proximos_vencer: number; // <= 3 días
    por_prioridad: {
        urgente: number;
        alta: number;
        normal: number;
        baja: number;
    };
    por_estado: {
        pendiente: number;
        programada: number;
        completada: number;
        vencida: number;
        cancelada: number;
    };
}

export interface CargaTecnico {
    id_tecnico: number;
    nombre: string;
    zona: string;
    servicios_hoy: number;
    servicios_semana: number;
    servicios_mes: number;
    carga_porcentaje: number; // 0-100 basado en capacidad
}

@Injectable()
export class AgendaService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Obtiene servicios programados para HOY
     * Caso de uso: Admin entra a agenda y ve qué servicios hay hoy
     */
    async getServiciosHoy(): Promise<{ data: ServicioProgramado[]; total: number }> {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);

        return this.getServiciosPorRango(hoy, manana);
    }

    /**
     * Obtiene servicios programados para esta SEMANA
     */
    async getServiciosSemana(): Promise<{ data: ServicioProgramado[]; total: number }> {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Inicio de semana (lunes)
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);

        // Fin de semana (domingo)
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 7);

        return this.getServiciosPorRango(inicioSemana, finSemana);
    }

    /**
     * Obtiene servicios programados para este MES
     */
    async getServiciosMes(): Promise<{ data: ServicioProgramado[]; total: number }> {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

        return this.getServiciosPorRango(inicioMes, finMes);
    }

    /**
     * Obtiene servicios VENCIDOS (fecha_fin_ventana pasada sin completar)
     * Alerta crítica para el administrador
     */
    async getServiciosVencidos(): Promise<{ data: ServicioProgramado[]; total: number }> {
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const cronogramas = await this.prisma.cronogramas_servicio.findMany({
                where: {
                    OR: [
                        { estado_cronograma: 'VENCIDA' },
                        {
                            estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
                            fecha_fin_ventana: { lt: hoy },
                        },
                    ],
                },
                include: this.getIncludeRelations(),
                orderBy: [
                    { prioridad: 'desc' },
                    { fecha_prevista: 'asc' },
                ],
            });

            const data = cronogramas.map(c => this.mapToServicioProgramado(c));

            return { data, total: data.length };
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener servicios vencidos: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Obtiene servicios próximos a vencer (próximos N días)
     * @param dias Número de días hacia adelante (default: 7)
     */
    async getServiciosProximos(dias: number = 7): Promise<{ data: ServicioProgramado[]; total: number }> {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const limite = new Date(hoy);
        limite.setDate(limite.getDate() + dias);

        return this.getServiciosPorRango(hoy, limite, ['PENDIENTE', 'PROGRAMADA']);
    }

    /**
     * Obtiene servicios con filtros avanzados enterprise
     */
    async getServiciosConFiltros(
        filters: AgendaFilters,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ data: ServicioProgramado[]; total: number; meta: any }> {
        try {
            const skip = (page - 1) * limit;
            const where = this.buildWhereClause(filters);

            const [cronogramas, total] = await Promise.all([
                this.prisma.cronogramas_servicio.findMany({
                    where,
                    include: this.getIncludeRelations(),
                    orderBy: [
                        { prioridad: 'desc' },
                        { fecha_prevista: 'asc' },
                    ],
                    skip,
                    take: limit,
                }),
                this.prisma.cronogramas_servicio.count({ where }),
            ]);

            const data = cronogramas.map(c => this.mapToServicioProgramado(c));

            return {
                data,
                total,
                meta: {
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            };
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener servicios: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Obtiene métricas y KPIs de la agenda
     */
    async getMetricas(): Promise<AgendaMetricas> {
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);

            // Inicio de semana
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 7);

            // Inicio de mes
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

            // Próximos 3 días (alerta)
            const en3Dias = new Date(hoy);
            en3Dias.setDate(en3Dias.getDate() + 3);

            // Ejecutar todas las consultas en paralelo
            const [
                totalProgramados,
                serviciosHoy,
                serviciosSemana,
                serviciosMes,
                vencidos,
                proximosVencer,
                porPrioridad,
                porEstado,
            ] = await Promise.all([
                // Total activos
                this.prisma.cronogramas_servicio.count({
                    where: { estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] } },
                }),
                // Hoy
                this.prisma.cronogramas_servicio.count({
                    where: {
                        fecha_prevista: { gte: hoy, lt: manana },
                        estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
                    },
                }),
                // Semana
                this.prisma.cronogramas_servicio.count({
                    where: {
                        fecha_prevista: { gte: inicioSemana, lt: finSemana },
                        estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
                    },
                }),
                // Mes
                this.prisma.cronogramas_servicio.count({
                    where: {
                        fecha_prevista: { gte: inicioMes, lte: finMes },
                        estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
                    },
                }),
                // Vencidos
                this.prisma.cronogramas_servicio.count({
                    where: {
                        OR: [
                            { estado_cronograma: 'VENCIDA' },
                            {
                                estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
                                fecha_fin_ventana: { lt: hoy },
                            },
                        ],
                    },
                }),
                // Próximos a vencer (3 días)
                this.prisma.cronogramas_servicio.count({
                    where: {
                        fecha_prevista: { gte: hoy, lte: en3Dias },
                        estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
                    },
                }),
                // Por prioridad
                this.prisma.cronogramas_servicio.groupBy({
                    by: ['prioridad'],
                    where: { estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] } },
                    _count: true,
                }),
                // Por estado
                this.prisma.cronogramas_servicio.groupBy({
                    by: ['estado_cronograma'],
                    _count: true,
                }),
            ]);

            // Mapear prioridades
            const prioridadMap: Record<string, number> = { URGENTE: 0, ALTA: 0, NORMAL: 0, BAJA: 0 };
            porPrioridad.forEach((p: any) => {
                const key = p.prioridad?.toUpperCase() || 'NORMAL';
                if (key in prioridadMap) {
                    prioridadMap[key] = p._count;
                }
            });

            // Mapear estados
            const estadoMap: Record<string, number> = {
                PENDIENTE: 0,
                PROGRAMADA: 0,
                COMPLETADA: 0,
                VENCIDA: 0,
                CANCELADA: 0,
            };
            porEstado.forEach((e: any) => {
                const key = e.estado_cronograma?.toUpperCase() || 'PENDIENTE';
                if (key in estadoMap) {
                    estadoMap[key] = e._count;
                }
            });

            return {
                total_programados: totalProgramados,
                servicios_hoy: serviciosHoy,
                servicios_semana: serviciosSemana,
                servicios_mes: serviciosMes,
                vencidos,
                proximos_vencer: proximosVencer,
                por_prioridad: {
                    urgente: prioridadMap.URGENTE,
                    alta: prioridadMap.ALTA,
                    normal: prioridadMap.NORMAL,
                    baja: prioridadMap.BAJA,
                },
                por_estado: {
                    pendiente: estadoMap.PENDIENTE,
                    programada: estadoMap.PROGRAMADA,
                    completada: estadoMap.COMPLETADA,
                    vencida: estadoMap.VENCIDA,
                    cancelada: estadoMap.CANCELADA,
                },
            };
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener métricas de agenda: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Obtiene carga de trabajo por técnico
     * Útil para balanceo de asignaciones
     */
    async getCargaTecnicos(): Promise<CargaTecnico[]> {
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const manana = new Date(hoy);
            manana.setDate(manana.getDate() + 1);

            // Semana
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 7);

            // Mes
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);

            // Obtener técnicos activos
            const tecnicos = await this.prisma.empleados.findMany({
                where: {
                    es_tecnico: true,
                    empleado_activo: true,
                },
                include: {
                    persona: true,
                },
            });

            // Para cada técnico, contar sus órdenes asignadas
            const cargaTecnicos: CargaTecnico[] = await Promise.all(
                tecnicos.map(async (tecnico) => {
                    const [serviciosHoy, serviciosSemana, serviciosMes] = await Promise.all([
                        this.prisma.ordenes_servicio.count({
                            where: {
                                id_tecnico_asignado: tecnico.id_empleado,
                                fecha_programada: { gte: hoy, lt: manana },
                                estados_orden: {
                                    codigo_estado: { in: ['PROGRAMADA', 'ASIGNADA', 'EN_PROCESO'] },
                                },
                            },
                        }),
                        this.prisma.ordenes_servicio.count({
                            where: {
                                id_tecnico_asignado: tecnico.id_empleado,
                                fecha_programada: { gte: inicioSemana, lt: finSemana },
                                estados_orden: {
                                    codigo_estado: { in: ['PROGRAMADA', 'ASIGNADA', 'EN_PROCESO'] },
                                },
                            },
                        }),
                        this.prisma.ordenes_servicio.count({
                            where: {
                                id_tecnico_asignado: tecnico.id_empleado,
                                fecha_programada: { gte: inicioMes, lte: finMes },
                                estados_orden: {
                                    codigo_estado: { in: ['PROGRAMADA', 'ASIGNADA', 'EN_PROCESO'] },
                                },
                            },
                        }),
                    ]);

                    // Capacidad máxima estimada: 4 servicios/día = 20/semana
                    const capacidadSemana = 20;
                    const cargaPorcentaje = Math.min(100, Math.round((serviciosSemana / capacidadSemana) * 100));

                    return {
                        id_tecnico: tecnico.id_empleado,
                        nombre: tecnico.persona?.nombre_completo || `Técnico #${tecnico.id_empleado}`,
                        zona: tecnico.departamento || 'Sin zona',
                        servicios_hoy: serviciosHoy,
                        servicios_semana: serviciosSemana,
                        servicios_mes: serviciosMes,
                        carga_porcentaje: cargaPorcentaje,
                    };
                }),
            );

            // Ordenar por carga (menor primero para sugerir asignación)
            return cargaTecnicos.sort((a, b) => a.carga_porcentaje - b.carga_porcentaje);
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener carga de técnicos: ${(error as Error).message}`,
            );
        }
    }

    /**
     * Obtiene servicios agrupados por fecha para vista calendario
     */
    async getServiciosCalendario(
        fechaDesde: Date,
        fechaHasta: Date,
    ): Promise<Map<string, ServicioProgramado[]>> {
        try {
            const cronogramas = await this.prisma.cronogramas_servicio.findMany({
                where: {
                    fecha_prevista: {
                        gte: fechaDesde,
                        lte: fechaHasta,
                    },
                    estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA', 'COMPLETADA'] },
                },
                include: this.getIncludeRelations(),
                orderBy: { fecha_prevista: 'asc' },
            });

            // Agrupar por fecha
            const porFecha = new Map<string, ServicioProgramado[]>();

            cronogramas.forEach(c => {
                const fecha = c.fecha_prevista.toISOString().split('T')[0];
                if (!porFecha.has(fecha)) {
                    porFecha.set(fecha, []);
                }
                porFecha.get(fecha)!.push(this.mapToServicioProgramado(c));
            });

            return porFecha;
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener calendario: ${(error as Error).message}`,
            );
        }
    }

    // ============================================
    // MÉTODOS PRIVADOS AUXILIARES
    // ============================================

    private async getServiciosPorRango(
        desde: Date,
        hasta: Date,
        estados: string[] = ['PENDIENTE', 'PROGRAMADA'],
    ): Promise<{ data: ServicioProgramado[]; total: number }> {
        try {
            const cronogramas = await this.prisma.cronogramas_servicio.findMany({
                where: {
                    fecha_prevista: {
                        gte: desde,
                        lt: hasta,
                    },
                    estado_cronograma: { in: estados as any },
                },
                include: this.getIncludeRelations(),
                orderBy: [
                    { prioridad: 'desc' },
                    { fecha_prevista: 'asc' },
                ],
            });

            const data = cronogramas.map(c => this.mapToServicioProgramado(c));

            return { data, total: data.length };
        } catch (error) {
            throw new InternalServerErrorException(
                `Error al obtener servicios por rango: ${(error as Error).message}`,
            );
        }
    }

    private getIncludeRelations() {
        return {
            contratos_mantenimiento: {
                include: {
                    clientes: {
                        include: {
                            persona: true,
                        },
                    },
                },
            },
            equipos: {
                include: {
                    tipos_equipo: true,
                    sedes_cliente: true,
                },
            },
            tipos_servicio: true,
            ordenes_servicio: {
                include: {
                    estados_orden: true,
                    empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
                        include: {
                            persona: true,
                        },
                    },
                },
            },
        };
    }

    private buildWhereClause(filters: AgendaFilters): any {
        const where: any = {};

        // Filtro por rango de fechas
        if (filters.fechaDesde || filters.fechaHasta) {
            where.fecha_prevista = {};
            if (filters.fechaDesde) {
                where.fecha_prevista.gte = new Date(filters.fechaDesde);
            }
            if (filters.fechaHasta) {
                where.fecha_prevista.lte = new Date(filters.fechaHasta);
            }
        }

        // Filtro por cliente
        if (filters.clienteId) {
            where.contratos_mantenimiento = {
                id_cliente: filters.clienteId,
            };
        }

        // Filtro por tipo de servicio
        if (filters.tipoServicioId) {
            where.tipo_servicio_programado = filters.tipoServicioId;
        }

        // Filtro por estado
        if (filters.estado) {
            where.estado_cronograma = filters.estado;
        }

        // Filtro por prioridad
        if (filters.prioridad) {
            where.prioridad = filters.prioridad;
        }

        // Filtro por técnico (a través de la orden generada)
        if (filters.tecnicoId) {
            where.ordenes_servicio = {
                id_tecnico_asignado: filters.tecnicoId,
            };
        }

        // Filtro por zona geográfica
        if (filters.zonaGeografica) {
            where.equipos = {
                sedes_cliente: {
                    zona_geografica: filters.zonaGeografica,
                },
            };
        }

        return where;
    }

    private mapToServicioProgramado(cronograma: any): ServicioProgramado {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaPrevista = new Date(cronograma.fecha_prevista);
        const diasRestantes = Math.ceil((fechaPrevista.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        // Calcular nivel de urgencia
        let nivelUrgencia: 'CRITICA' | 'ALTA' | 'MEDIA' | 'NORMAL' = 'NORMAL';
        if (diasRestantes < 0) {
            nivelUrgencia = 'CRITICA';
        } else if (diasRestantes <= 3) {
            nivelUrgencia = 'CRITICA';
        } else if (diasRestantes <= 7) {
            nivelUrgencia = 'ALTA';
        } else if (diasRestantes <= 15) {
            nivelUrgencia = 'MEDIA';
        }

        // Extraer datos del cliente
        const contrato = cronograma.contratos_mantenimiento;
        const cliente = contrato?.clientes;
        const persona = cliente?.persona;

        // Extraer datos del equipo
        const equipo = cronograma.equipos;
        const tipoEquipo = equipo?.tipos_equipo;
        const sede = equipo?.sedes_cliente;

        // Extraer datos de la orden (si existe)
        const orden = cronograma.ordenes_servicio;
        const tecnico = orden?.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;

        return {
            id_cronograma: cronograma.id_cronograma,
            fecha_prevista: cronograma.fecha_prevista,
            fecha_inicio_ventana: cronograma.fecha_inicio_ventana,
            fecha_fin_ventana: cronograma.fecha_fin_ventana,
            estado_cronograma: cronograma.estado_cronograma,
            prioridad: cronograma.prioridad,
            dias_restantes: diasRestantes,
            nivel_urgencia: nivelUrgencia,
            cliente: {
                id: cliente?.id_cliente || 0,
                nombre: persona?.nombre_completo || persona?.razon_social || 'Sin nombre',
                codigo: cliente?.codigo_cliente || '',
            },
            equipo: {
                id: equipo?.id_equipo || 0,
                codigo: equipo?.codigo_equipo || '',
                nombre_tipo: tipoEquipo?.nombre_tipo || 'Sin tipo',
                sede: sede?.nombre_sede,
                zona: sede?.zona_geografica,
            },
            tipo_servicio: {
                id: cronograma.tipos_servicio?.id_tipo_servicio || 0,
                nombre: cronograma.tipos_servicio?.nombre_tipo || '',
                codigo: cronograma.tipos_servicio?.codigo_tipo || '',
            },
            contrato: {
                id: contrato?.id_contrato || 0,
                codigo: contrato?.codigo_contrato || '',
            },
            tecnico_asignado: tecnico ? {
                id: tecnico.id_empleado,
                nombre: tecnico.persona?.nombre_completo || '',
            } : undefined,
            orden_servicio: orden ? {
                id: orden.id_orden_servicio,
                numero: orden.numero_orden,
                estado: orden.estados_orden?.nombre_estado || '',
            } : undefined,
        };
    }
}
