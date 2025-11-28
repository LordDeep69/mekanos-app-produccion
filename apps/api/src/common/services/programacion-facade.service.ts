/**
 * PROGRAMACIÓN FACADE SERVICE - MEKANOS S.A.S
 *
 * Servicio encapsulado para gestión de contratos y cronogramas.
 * Implementa FASE 5 POST-CRUD:
 *
 * - FSM de estados de contratos
 * - Alerta de renovación 30 días antes
 * - Cálculo de próximos servicios basado en contrato
 * - Generación automática de órdenes borrador
 * - Vista calendario con eventos programados
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 5 POST-CRUD
 */

import { PrismaService } from '@mekanos/database';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
    criterio_intervalo_enum,
    estado_contrato_enum,
    periodicidad_enum
} from '@prisma/client';
import { NumeracionService } from './numeracion.service';

// ==================== TIPOS DE ENTRADA ====================

/**
 * Estados válidos del contrato
 */
export type EstadoContrato = 'ACTIVO' | 'SUSPENDIDO' | 'FINALIZADO' | 'RENOVACION_PENDIENTE';

/**
 * Transiciones válidas del FSM de contratos
 */
const TRANSICIONES_CONTRATO: Record<EstadoContrato, EstadoContrato[]> = {
  ACTIVO: ['SUSPENDIDO', 'FINALIZADO', 'RENOVACION_PENDIENTE'],
  SUSPENDIDO: ['ACTIVO', 'FINALIZADO'],
  RENOVACION_PENDIENTE: ['ACTIVO', 'FINALIZADO'],
  FINALIZADO: [], // Estado terminal
};

/**
 * Input para crear contrato
 */
export interface CrearContratoInput {
  idCliente: number;
  idAsesorResponsable: number;
  tipoContrato?: 'PREVENTIVO_RECURRENTE' | 'CORRECTIVO_DEMANDA' | 'FULL_SERVICE' | 'EMERGENCIAS';
  periodicidadDefault?: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  fechaInicio: Date;
  fechaFin?: Date;
  generaAutomaticamente?: boolean;
  diasAnticipacionGeneracion?: number;
  observaciones?: string;
  creadoPor: number;
}

/**
 * Input para agregar equipo a contrato
 */
export interface AgregarEquipoContratoInput {
  idContrato: number;
  idEquipo: number;
  idTipoServicioDefault: number;
  criterioIntervalo?: 'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO';
  intervaloDias?: number;
  intervaloHoras?: number;
}

/**
 * Input para generar cronogramas
 */
export interface GenerarCronogramasInput {
  idContrato: number;
  mesesAdelante?: number; // Default 1 mes
  creadoPor: number;
}

/**
 * Resultado de operación
 */
export interface ProgramacionResult {
  success: boolean;
  mensaje?: string;
  error?: string;
  data?: any;
}

/**
 * Contrato próximo a vencer
 */
export interface ContratoProximoVencer {
  idContrato: number;
  codigoContrato: string;
  nombreCliente: string;
  fechaFin: Date;
  diasRestantes: number;
  estado: string;
}

/**
 * Evento de calendario
 */
export interface EventoCalendario {
  id: number;
  titulo: string;
  fecha: Date;
  tipo: 'SERVICIO_PROGRAMADO' | 'RENOVACION_CONTRATO' | 'ORDEN_VENCIDA';
  prioridad: string;
  estado: string;
  cliente?: string;
  equipo?: string;
  idContrato?: number;
  idOrdenServicio?: number;
}

// ==================== SERVICIO PRINCIPAL ====================

@Injectable()
export class ProgramacionFacadeService {
  private readonly logger = new Logger(ProgramacionFacadeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numeracionService: NumeracionService,
  ) {}

  // ==================== FSM CONTRATOS ====================

  /**
   * Crea un nuevo contrato de mantenimiento
   * Genera código automático: CONT-YYYY-XXXX
   */
  async crearContrato(input: CrearContratoInput): Promise<ProgramacionResult> {
    try {
      this.logger.log(`Creando contrato para cliente ${input.idCliente}`);

      // Verificar cliente existe
      const cliente = await this.prisma.clientes.findUnique({
        where: { id_cliente: input.idCliente },
        include: { persona: true },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente ${input.idCliente} no encontrado`);
      }

      // Generar código de contrato
      const year = new Date().getFullYear();
      const ultimoContrato = await this.prisma.contratos_mantenimiento.findFirst({
        where: { codigo_contrato: { startsWith: `CONT-${year}-` } },
        orderBy: { id_contrato: 'desc' },
      });

      let consecutivo = 1;
      if (ultimoContrato) {
        const matches = ultimoContrato.codigo_contrato.match(/CONT-\d{4}-(\d{4})/);
        if (matches) consecutivo = parseInt(matches[1]) + 1;
      }
      const codigoContrato = `CONT-${year}-${consecutivo.toString().padStart(4, '0')}`;

      // Crear contrato
      const contrato = await this.prisma.contratos_mantenimiento.create({
        data: {
          codigo_contrato: codigoContrato,
          id_cliente: input.idCliente,
          id_asesor_responsable: input.idAsesorResponsable,
          tipo_contrato: input.tipoContrato as any || 'PREVENTIVO_RECURRENTE',
          periodicidad_default: input.periodicidadDefault as periodicidad_enum || 'MENSUAL',
          fecha_inicio: input.fechaInicio,
          fecha_fin: input.fechaFin,
          estado_contrato: 'ACTIVO',
          genera_automaticamente: input.generaAutomaticamente ?? true,
          dias_anticipacion_generacion: input.diasAnticipacionGeneracion || 7,
          observaciones: input.observaciones,
          creado_por: input.creadoPor,
        },
        include: {
          cliente: { include: { persona: true } },
        },
      });

      this.logger.log(`✅ Contrato creado: ${codigoContrato}`);

      return {
        success: true,
        mensaje: `Contrato ${codigoContrato} creado exitosamente`,
        data: {
          idContrato: contrato.id_contrato,
          codigoContrato: contrato.codigo_contrato,
          cliente: cliente.persona.razon_social || cliente.persona.nombre_completo,
          estado: 'ACTIVO',
        },
      };
    } catch (error) {
      this.logger.error(`Error creando contrato: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cambia el estado de un contrato (FSM)
   * Valida transiciones permitidas
   */
  async cambiarEstadoContrato(
    idContrato: number,
    nuevoEstado: EstadoContrato,
    modificadoPor: number,
    observaciones?: string,
  ): Promise<ProgramacionResult> {
    try {
      const contrato = await this.prisma.contratos_mantenimiento.findUnique({
        where: { id_contrato: idContrato },
      });

      if (!contrato) {
        throw new NotFoundException(`Contrato ${idContrato} no encontrado`);
      }

      const estadoActual = contrato.estado_contrato as EstadoContrato;
      const transicionesPermitidas = TRANSICIONES_CONTRATO[estadoActual];

      if (!transicionesPermitidas.includes(nuevoEstado)) {
        throw new BadRequestException(
          `Transición no permitida: ${estadoActual} → ${nuevoEstado}. ` +
          `Transiciones válidas: ${transicionesPermitidas.join(', ') || 'Ninguna (estado terminal)'}`
        );
      }

      // Actualizar estado
      await this.prisma.contratos_mantenimiento.update({
        where: { id_contrato: idContrato },
        data: { estado_contrato: nuevoEstado as estado_contrato_enum },
      });

      // Registrar en historial
      await this.prisma.historial_contrato.create({
        data: {
          id_contrato: idContrato,
          tipo_cambio: 'CAMBIO_ESTADO',
          descripcion_cambio: `Estado cambiado: ${estadoActual} → ${nuevoEstado}`,
          valor_anterior: estadoActual,
          valor_nuevo: nuevoEstado,
          observaciones,
          modificado_por: modificadoPor,
          fecha_cambio: new Date(),
        },
      });

      this.logger.log(`✅ Contrato ${contrato.codigo_contrato}: ${estadoActual} → ${nuevoEstado}`);

      return {
        success: true,
        mensaje: `Estado cambiado a ${nuevoEstado}`,
        data: { estadoAnterior: estadoActual, estadoNuevo: nuevoEstado },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene contratos próximos a vencer (30 días o menos)
   * Usado para alertas de renovación
   */
  async obtenerContratosProximosVencer(diasAnticipacion: number = 30): Promise<ContratoProximoVencer[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const contratos = await this.prisma.contratos_mantenimiento.findMany({
      where: {
        estado_contrato: 'ACTIVO',
        fecha_fin: {
          not: null,
          lte: fechaLimite,
        },
      },
      include: {
        cliente: { include: { persona: true } },
      },
      orderBy: { fecha_fin: 'asc' },
    });

    return contratos.map(c => {
      const hoy = new Date();
      const fechaFin = new Date(c.fecha_fin!);
      const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      return {
        idContrato: c.id_contrato,
        codigoContrato: c.codigo_contrato,
        nombreCliente: c.cliente.persona.razon_social || c.cliente.persona.nombre_completo || '',
        fechaFin: fechaFin,
        diasRestantes,
        estado: c.estado_contrato,
      };
    });
  }

  /**
   * Marca automáticamente contratos próximos a vencer como RENOVACION_PENDIENTE
   * Se debe ejecutar como CRON job diario
   */
  async procesarContratosProximosVencer(diasAnticipacion: number = 30): Promise<ProgramacionResult> {
    try {
      const contratosProximos = await this.obtenerContratosProximosVencer(diasAnticipacion);
      
      let actualizados = 0;
      for (const contrato of contratosProximos) {
        if (contrato.estado !== 'RENOVACION_PENDIENTE') {
          await this.cambiarEstadoContrato(
            contrato.idContrato,
            'RENOVACION_PENDIENTE',
            1, // Sistema
            `Marcado automáticamente - ${contrato.diasRestantes} días para vencer`,
          );
          actualizados++;
        }
      }

      this.logger.log(`✅ Procesados ${actualizados} contratos próximos a vencer`);

      return {
        success: true,
        mensaje: `${actualizados} contratos marcados como RENOVACION_PENDIENTE`,
        data: { procesados: contratosProximos.length, actualizados },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== EQUIPOS EN CONTRATO ====================

  /**
   * Agrega un equipo a un contrato
   */
  async agregarEquipoContrato(input: AgregarEquipoContratoInput): Promise<ProgramacionResult> {
    try {
      // Verificar contrato existe y está activo
      const contrato = await this.prisma.contratos_mantenimiento.findUnique({
        where: { id_contrato: input.idContrato },
      });

      if (!contrato) {
        throw new NotFoundException(`Contrato ${input.idContrato} no encontrado`);
      }

      if (contrato.estado_contrato !== 'ACTIVO') {
        throw new BadRequestException(
          `Solo se pueden agregar equipos a contratos ACTIVOS. Estado actual: ${contrato.estado_contrato}`
        );
      }

      // Verificar equipo existe
      const equipo = await this.prisma.equipos.findUnique({
        where: { id_equipo: input.idEquipo },
      });

      if (!equipo) {
        throw new NotFoundException(`Equipo ${input.idEquipo} no encontrado`);
      }

      // Verificar equipo no está ya en el contrato
      const existente = await this.prisma.equipos_contrato.findFirst({
        where: {
          id_contrato: input.idContrato,
          id_equipo: input.idEquipo,
        },
      });

      if (existente) {
        throw new BadRequestException(
          `Equipo ${equipo.codigo_equipo} ya está incluido en este contrato`
        );
      }

      // Crear relación equipo-contrato
      const equipoContrato = await this.prisma.equipos_contrato.create({
        data: {
          id_contrato: input.idContrato,
          id_equipo: input.idEquipo,
          tipo_servicio_default: input.idTipoServicioDefault,
          criterio_intervalo: (input.criterioIntervalo as criterio_intervalo_enum) || 'DIAS',
          intervalo_dias: input.intervaloDias || 30,
          intervalo_horas: input.intervaloHoras,
          activo_en_contrato: true,
          fecha_inclusion: new Date(),
        },
      });

      this.logger.log(`✅ Equipo ${equipo.codigo_equipo} agregado a contrato ${contrato.codigo_contrato}`);

      return {
        success: true,
        mensaje: `Equipo agregado al contrato`,
        data: {
          idEquipoContrato: equipoContrato.id_equipo_contrato,
          codigoEquipo: equipo.codigo_equipo,
          codigoContrato: contrato.codigo_contrato,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== GENERACIÓN DE CRONOGRAMAS ====================

  /**
   * Genera cronogramas de servicio para un contrato
   * Calcula fechas basándose en intervalo de cada equipo
   */
  async generarCronogramas(input: GenerarCronogramasInput): Promise<ProgramacionResult> {
    try {
      this.logger.log(`Generando cronogramas para contrato ${input.idContrato}`);

      const contrato = await this.prisma.contratos_mantenimiento.findUnique({
        where: { id_contrato: input.idContrato },
        include: {
          equipos_contrato: {
            where: { activo_en_contrato: true },
            include: {
              equipo: true,
              tipos_servicio: true,
            },
          },
        },
      });

      if (!contrato) {
        throw new NotFoundException(`Contrato ${input.idContrato} no encontrado`);
      }

      if (contrato.estado_contrato !== 'ACTIVO') {
        throw new BadRequestException(
          `Solo se pueden generar cronogramas para contratos ACTIVOS`
        );
      }

      const mesesAdelante = input.mesesAdelante || 1;
      const fechaLimite = new Date();
      fechaLimite.setMonth(fechaLimite.getMonth() + mesesAdelante);

      let cronogramasCreados = 0;
      const resultados: any[] = [];

      for (const equipoContrato of contrato.equipos_contrato) {
        // Obtener último servicio del equipo
        const ultimoCronograma = await this.prisma.cronogramas_servicio.findFirst({
          where: {
            id_equipo_contrato: equipoContrato.id_equipo_contrato,
            estado_cronograma: { in: ['COMPLETADA', 'PROGRAMADA', 'PENDIENTE'] },
          },
          orderBy: { fecha_prevista: 'desc' },
        });

        // Calcular fecha base
        let fechaBase = ultimoCronograma 
          ? new Date(ultimoCronograma.fecha_prevista)
          : new Date(contrato.fecha_inicio);

        // Generar cronogramas hasta la fecha límite
        while (true) {
          // Calcular próxima fecha según intervalo
          const proximaFecha = this.calcularProximaFecha(
            fechaBase,
            equipoContrato.criterio_intervalo,
            equipoContrato.intervalo_dias || 30,
          );

          if (proximaFecha > fechaLimite) break;

          // Verificar que no existe ya un cronograma para esta fecha
          const existente = await this.prisma.cronogramas_servicio.findFirst({
            where: {
              id_equipo_contrato: equipoContrato.id_equipo_contrato,
              fecha_prevista: proximaFecha,
            },
          });

          if (!existente) {
            // Calcular ventana de servicio (±3 días)
            const ventanaInicio = new Date(proximaFecha);
            ventanaInicio.setDate(ventanaInicio.getDate() - 3);
            const ventanaFin = new Date(proximaFecha);
            ventanaFin.setDate(ventanaFin.getDate() + 3);

            const cronograma = await this.prisma.cronogramas_servicio.create({
              data: {
                id_contrato: input.idContrato,
                id_equipo: equipoContrato.id_equipo,
                id_equipo_contrato: equipoContrato.id_equipo_contrato,
                tipo_servicio_programado: equipoContrato.tipo_servicio_default,
                fecha_prevista: proximaFecha,
                fecha_inicio_ventana: ventanaInicio,
                fecha_fin_ventana: ventanaFin,
                fecha_base_calculo: fechaBase,
                estado_cronograma: 'PENDIENTE',
                prioridad: 'NORMAL',
                creado_por: input.creadoPor,
              },
            });

            cronogramasCreados++;
            resultados.push({
              idCronograma: cronograma.id_cronograma,
              equipo: equipoContrato.equipo.codigo_equipo,
              fechaPrevista: proximaFecha,
              tipoServicio: equipoContrato.tipos_servicio.nombre_servicio,
            });
          }

          fechaBase = proximaFecha;
        }
      }

      this.logger.log(`✅ Generados ${cronogramasCreados} cronogramas para contrato ${contrato.codigo_contrato}`);

      return {
        success: true,
        mensaje: `${cronogramasCreados} cronogramas generados`,
        data: {
          contrato: contrato.codigo_contrato,
          cronogramasCreados,
          detalles: resultados,
        },
      };
    } catch (error) {
      this.logger.error(`Error generando cronogramas: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Genera órdenes de servicio borrador desde cronogramas pendientes
   */
  async generarOrdenesDesdeCronogramas(diasAnticipacion: number = 7): Promise<ProgramacionResult> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

      // Obtener cronogramas PENDIENTES próximos
      const cronogramasPendientes = await this.prisma.cronogramas_servicio.findMany({
        where: {
          estado_cronograma: 'PENDIENTE',
          fecha_prevista: { lte: fechaLimite },
          id_orden_servicio_generada: null,
        },
        include: {
          contrato: {
            include: {
              cliente: { include: { persona: true } },
            },
          },
          equipo: true,
          tipos_servicio: true,
          equipos_contrato: true,
        },
      });

      let ordenesCreadas = 0;
      const resultados: any[] = [];

      for (const cronograma of cronogramasPendientes) {
        // Generar número de orden
        const numeracion = await this.numeracionService.generarNumero('ORDEN_SERVICIO');

        // Obtener estado PROGRAMADA
        const estadoProgramada = await this.prisma.estados_orden.findFirst({
          where: { nombre_estado: 'PROGRAMADA' },
        });

        // Crear orden de servicio borrador
        const orden = await this.prisma.ordenes_servicio.create({
          data: {
            numero_orden: numeracion.codigo,
            id_cliente: cronograma.contrato.id_cliente,
            id_sede: null, // Se asigna después
            id_equipo: cronograma.id_equipo,
            id_tipo_servicio: cronograma.tipo_servicio_programado,
            id_estado_actual: estadoProgramada?.id_estado || 1,
            descripcion_inicial: `Servicio programado: ${cronograma.tipos_servicio?.nombre_servicio || 'Mantenimiento'}`,
            prioridad: cronograma.prioridad || 'NORMAL',
            origen_solicitud: 'CONTRATO',
            fecha_programada: cronograma.fecha_prevista,
            creado_por: 1, // Sistema
          },
        });

        // Actualizar cronograma
        await this.prisma.cronogramas_servicio.update({
          where: { id_cronograma: cronograma.id_cronograma },
          data: {
            estado_cronograma: 'PROGRAMADA',
            id_orden_servicio_generada: orden.id_orden_servicio,
            fecha_generacion_os: new Date(),
          },
        });

        ordenesCreadas++;
        resultados.push({
          idOrden: orden.id_orden_servicio,
          numeroOrden: orden.numero_orden,
          equipo: cronograma.equipo.codigo_equipo,
          fechaProgramada: cronograma.fecha_prevista,
        });
      }

      this.logger.log(`✅ Generadas ${ordenesCreadas} órdenes de servicio desde cronogramas`);

      return {
        success: true,
        mensaje: `${ordenesCreadas} órdenes generadas`,
        data: { ordenesCreadas, detalles: resultados },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== VISTA CALENDARIO ====================

  /**
   * Obtiene eventos para vista de calendario
   */
  async obtenerEventosCalendario(
    fechaInicio: Date,
    fechaFin: Date,
    idCliente?: number,
  ): Promise<EventoCalendario[]> {
    const eventos: EventoCalendario[] = [];

    // 1. Servicios programados
    const cronogramas = await this.prisma.cronogramas_servicio.findMany({
      where: {
        fecha_prevista: { gte: fechaInicio, lte: fechaFin },
        estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
        ...(idCliente ? { contrato: { id_cliente: idCliente } } : {}),
      },
      include: {
        contrato: { include: { cliente: { include: { persona: true } } } },
        equipo: true,
        tipos_servicio: true,
      },
    });

    for (const c of cronogramas) {
      eventos.push({
        id: c.id_cronograma,
        titulo: `${c.tipos_servicio?.nombre_servicio || 'Servicio'} - ${c.equipo.codigo_equipo}`,
        fecha: c.fecha_prevista,
        tipo: 'SERVICIO_PROGRAMADO',
        prioridad: c.prioridad || 'NORMAL',
        estado: c.estado_cronograma,
        cliente: c.contrato.cliente.persona.razon_social || c.contrato.cliente.persona.nombre_completo || '',
        equipo: c.equipo.codigo_equipo,
        idContrato: c.id_contrato,
        idOrdenServicio: c.id_orden_servicio_generada || undefined,
      });
    }

    // 2. Renovaciones de contrato
    const contratosProximosVencer = await this.obtenerContratosProximosVencer(60);
    for (const c of contratosProximosVencer) {
      if (c.fechaFin >= fechaInicio && c.fechaFin <= fechaFin) {
        eventos.push({
          id: c.idContrato,
          titulo: `Renovación contrato ${c.codigoContrato}`,
          fecha: c.fechaFin,
          tipo: 'RENOVACION_CONTRATO',
          prioridad: c.diasRestantes <= 7 ? 'URGENTE' : c.diasRestantes <= 15 ? 'ALTA' : 'NORMAL',
          estado: c.estado,
          cliente: c.nombreCliente,
          idContrato: c.idContrato,
        });
      }
    }

    // Ordenar por fecha
    eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return eventos;
  }

  /**
   * Obtiene resumen del mes para dashboard
   */
  async obtenerResumenMes(mes: number, anio: number): Promise<any> {
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);

    const [serviciosProgramados, serviciosCompletados, serviciosVencidos, renovacionesPendientes] =
      await Promise.all([
        this.prisma.cronogramas_servicio.count({
          where: {
            fecha_prevista: { gte: fechaInicio, lte: fechaFin },
            estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
          },
        }),
        this.prisma.cronogramas_servicio.count({
          where: {
            fecha_completado: { gte: fechaInicio, lte: fechaFin },
            estado_cronograma: 'COMPLETADA',
          },
        }),
        this.prisma.cronogramas_servicio.count({
          where: {
            fecha_prevista: { gte: fechaInicio, lte: fechaFin },
            estado_cronograma: 'VENCIDA',
          },
        }),
        this.prisma.contratos_mantenimiento.count({
          where: {
            estado_contrato: 'RENOVACION_PENDIENTE',
            fecha_fin: { gte: fechaInicio, lte: fechaFin },
          },
        }),
      ]);

    return {
      mes,
      anio,
      serviciosProgramados,
      serviciosCompletados,
      serviciosVencidos,
      renovacionesPendientes,
      porcentajeCumplimiento:
        serviciosProgramados > 0
          ? Math.round((serviciosCompletados / (serviciosProgramados + serviciosCompletados)) * 100)
          : 100,
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private calcularProximaFecha(
    fechaBase: Date,
    criterio: criterio_intervalo_enum | string,
    intervaloDias: number,
  ): Date {
    const proximaFecha = new Date(fechaBase);
    
    switch (criterio) {
      case 'DIAS':
        proximaFecha.setDate(proximaFecha.getDate() + intervaloDias);
        break;
      case 'HORAS':
        // Para horas, se calcula basado en lecturas de horómetro
        // Por ahora, usamos días como fallback
        proximaFecha.setDate(proximaFecha.getDate() + intervaloDias);
        break;
      case 'LO_QUE_OCURRA_PRIMERO':
        // Por ahora, usamos días
        proximaFecha.setDate(proximaFecha.getDate() + intervaloDias);
        break;
      default:
        proximaFecha.setDate(proximaFecha.getDate() + intervaloDias);
    }

    return proximaFecha;
  }
}

