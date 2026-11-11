/**
 * TAREAS PROGRAMADAS SERVICE - MEKANOS S.A.S
 *
 * Servicio de CRON jobs para tareas automáticas del sistema.
 * Utiliza @nestjs/schedule para programar tareas.
 *
 * JOBS IMPLEMENTADOS:
 * 1. Recordatorios de servicio (diario 8am)
 * 2. Marcar cotizaciones vencidas (diario medianoche)
 * 3. Alertar contratos por vencer (diario 9am)
 * 4. Generar órdenes desde cronogramas (día 25 de cada mes)
 * 5. Limpiar notificaciones antiguas (domingo medianoche)
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 6 POST-CRUD
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacionesService } from './notificaciones.service';

@Injectable()
export class TareasProgramadasService {
  private readonly logger = new Logger(TareasProgramadasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * JOB 1: Enviar recordatorios de servicios programados para mañana
   * Ejecuta: Todos los días a las 8:00 AM
   */
  @Cron('0 8 * * *', { name: 'recordatorios-servicio', timeZone: 'America/Bogota' })
  async enviarRecordatoriosServicio() {
    this.logger.log('🔔 CRON: Iniciando recordatorios de servicios...');

    try {
      // Obtener servicios programados para mañana
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      manana.setHours(0, 0, 0, 0);

      const pasadoManana = new Date(manana);
      pasadoManana.setDate(pasadoManana.getDate() + 1);

      // ✅ FIX 11-FEB-2026: Corregidos nombres de relaciones según schema.prisma
      const cronogramas = await this.prisma.cronogramas_servicio.findMany({
        where: {
          fecha_prevista: {
            gte: manana,
            lt: pasadoManana,
          },
          estado_cronograma: { in: ['PENDIENTE', 'PROGRAMADA'] },
        },
        include: {
          ordenes_servicio: {
            include: {
              empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
                include: { persona: true },
              },
            },
          },
          equipos: true,
          tipos_servicio: true,
        },
      });

      let notificacionesEnviadas = 0;

      for (const cronograma of cronogramas) {
        const tecnicoEmpleado =
          cronograma.ordenes_servicio?.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;
        if (tecnicoEmpleado) {
          // Resolver empleado -> usuario via id_persona
          const usuario = await this.prisma.usuarios.findFirst({
            where: { id_persona: tecnicoEmpleado.id_persona },
          });
          if (!usuario) continue;

          const descripcion = `${cronograma.tipos_servicio?.nombre_tipo || 'Servicio'} - ${cronograma.equipos?.codigo_equipo || 'Equipo'}`;

          await this.notificacionesService.notificarServicioProgramado(
            usuario.id_usuario,
            descripcion,
            cronograma.id_cronograma,
            cronograma.fecha_prevista,
          );
          notificacionesEnviadas++;
        }
      }

      this.logger.log(`✅ CRON: ${notificacionesEnviadas} recordatorios enviados`);
    } catch (error) {
      this.logger.error(`❌ CRON Error recordatorios: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * JOB 2: Marcar cotizaciones como vencidas
   * Ejecuta: Todos los días a medianoche
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'cotizaciones-vencidas',
    timeZone: 'America/Bogota',
  })
  async marcarCotizacionesVencidas() {
    this.logger.log('📋 CRON: Verificando cotizaciones vencidas...');

    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Obtener estado ENVIADA
      const estadoEnviada = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'ENVIADA' },
      });

      // Obtener estado VENCIDA
      const estadoVencida = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'VENCIDA' },
      });

      if (!estadoEnviada || !estadoVencida) {
        this.logger.warn('Estados de cotización no configurados');
        return;
      }

      // Buscar cotizaciones ENVIADAS con fecha de vencimiento pasada
      const cotizacionesVencidas = await this.prisma.cotizaciones.findMany({
        where: {
          id_estado: estadoEnviada.id_estado,
          fecha_vencimiento: { lt: hoy },
        },
      });

      if (cotizacionesVencidas.length > 0) {
        await this.prisma.cotizaciones.updateMany({
          where: {
            id_cotizacion: { in: cotizacionesVencidas.map((c) => c.id_cotizacion) },
          },
          data: {
            id_estado: estadoVencida.id_estado,
            fecha_modificacion: new Date(),
          },
        });

        this.logger.log(
          `✅ CRON: ${cotizacionesVencidas.length} cotizaciones marcadas como VENCIDAS`,
        );
      } else {
        this.logger.log('✅ CRON: No hay cotizaciones vencidas');
      }
    } catch (error) {
      this.logger.error(`❌ CRON Error cotizaciones vencidas: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * JOB 3: Alertar contratos próximos a vencer (30 días)
   * Ejecuta: Todos los días a las 9:00 AM
   */
  @Cron('0 9 * * *', { name: 'contratos-por-vencer', timeZone: 'America/Bogota' })
  async alertarContratosPorVencer() {
    this.logger.log('📅 CRON: Verificando contratos por vencer...');

    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);

      const contratos = await this.prisma.contratos_mantenimiento.findMany({
        where: {
          estado_contrato: 'ACTIVO',
          fecha_fin: {
            not: null,
            lte: fechaLimite,
            gte: new Date(), // No incluir ya vencidos
          },
        },
        include: {
          // ✅ FIX 15-DIC-2025: Corregido nombre relación según schema.prisma
          clientes: { include: { persona: true } },
          empleados: { include: { persona: true } }, // asesor responsable via empleados
        },
      });

      let notificacionesEnviadas = 0;

      for (const contrato of contratos) {
        if (contrato.id_asesor_responsable) {
          const diasRestantes = Math.ceil(
            (new Date(contrato.fecha_fin!).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          );

          const nombreCliente =
            contrato.clientes.persona.razon_social ||
            contrato.clientes.persona.nombre_completo ||
            'Cliente';

          // Solo notificar una vez por contrato (verificar si ya existe notificación reciente)
          const notificacionExistente = await this.prisma.notificaciones.findFirst({
            where: {
              id_usuario: contrato.id_asesor_responsable,
              tipo_notificacion: 'CONTRATO_POR_VENCER',
              id_entidad_relacionada: contrato.id_contrato,
              fecha_creacion: {
                gte: new Date(new Date().setDate(new Date().getDate() - 7)), // Últimos 7 días
              },
            },
          });

          if (!notificacionExistente) {
            await this.notificacionesService.notificarContratoPorVencer(
              contrato.id_asesor_responsable,
              contrato.codigo_contrato,
              contrato.id_contrato,
              nombreCliente,
              diasRestantes,
            );
            notificacionesEnviadas++;
          }
        }
      }

      this.logger.log(`✅ CRON: ${notificacionesEnviadas} alertas de contratos enviadas`);
    } catch (error) {
      this.logger.error(`❌ CRON Error contratos por vencer: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * JOB 4: Generar órdenes de servicio desde cronogramas pendientes
   * Ejecuta: Día 25 de cada mes a las 10:00 AM
   */
  @Cron('0 10 25 * *', { name: 'generar-ordenes-cronogramas', timeZone: 'America/Bogota' })
  async generarOrdenesDesdeCronogramas() {
    this.logger.log('📦 CRON: Generando órdenes desde cronogramas...');

    try {
      // Importar el servicio de programación dinámicamente
      const { ProgramacionFacadeService } = await import(
        '../common/services/programacion-facade.service'
      );

      // Obtener instancia del servicio
      const programacionService = new ProgramacionFacadeService(
        this.prisma,
        // El NumeracionService se inyecta aquí si es necesario
        null as any,
      );

      // Generar órdenes para los próximos 7 días
      const resultado = await programacionService.generarOrdenesDesdeCronogramas(7);

      if (resultado.success) {
        this.logger.log(`✅ CRON: ${resultado.data?.ordenesCreadas || 0} órdenes generadas`);
      } else {
        this.logger.warn(`⚠️ CRON: Error generando órdenes: ${resultado.error}`);
      }
    } catch (error) {
      this.logger.error(`❌ CRON Error generar órdenes: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * JOB 5: Limpiar notificaciones antiguas (más de 90 días)
   * Ejecuta: Cada domingo a medianoche
   */
  @Cron(CronExpression.EVERY_WEEK, { name: 'limpiar-notificaciones', timeZone: 'America/Bogota' })
  async limpiarNotificacionesAntiguas() {
    this.logger.log('🗑️ CRON: Limpiando notificaciones antiguas...');

    try {
      const resultado = await this.notificacionesService.limpiarAntiguas(90);

      if (resultado.success) {
        this.logger.log(`✅ CRON: ${resultado.mensaje}`);
      }
    } catch (error) {
      this.logger.error(`❌ CRON Error limpiar notificaciones: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * JOB 6: Marcar órdenes vencidas (que pasaron su fecha programada)
   * Ejecuta: Todos los días a las 6:00 AM
   */
  @Cron('0 6 * * *', { name: 'ordenes-vencidas', timeZone: 'America/Bogota' })
  async marcarOrdenesVencidas() {
    this.logger.log('⏰ CRON: Verificando órdenes vencidas...');

    try {
      const ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      ayer.setHours(23, 59, 59, 999);

      // Buscar órdenes PROGRAMADAS que pasaron su fecha
      const estadoProgramada = await this.prisma.estados_orden.findFirst({
        where: { nombre_estado: { in: ['PROGRAMADA', 'Programada'] } },
      });

      if (!estadoProgramada) return;

      // ✅ FIX 11-FEB-2026: Corregido nombre de relación según schema.prisma
      const ordenesVencidas = await this.prisma.ordenes_servicio.findMany({
        where: {
          id_estado_actual: estadoProgramada.id_estado,
          fecha_programada: { lt: ayer },
        },
        include: {
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: true,
        },
      });

      // Notificar a supervisores sobre órdenes vencidas
      const supervisores = await this.prisma.usuarios.findMany({
        where: {
          usuarios_roles: {
            some: {
              roles: {
                nombre_rol: { in: ['SUPERVISOR', 'ADMINISTRADOR', 'GERENTE'] },
              },
            },
          },
          estado: 'ACTIVO',
        },
      });

      for (const orden of ordenesVencidas) {
        for (const supervisor of supervisores) {
          await this.notificacionesService.crear({
            idUsuarioDestino: supervisor.id_usuario,
            tipo: 'ORDEN_VENCIDA',
            titulo: 'Orden vencida',
            mensaje: `La orden ${orden.numero_orden} ha vencido sin ser ejecutada`,
            prioridad: 'URGENTE',
            idEntidadRelacionada: orden.id_orden_servicio,
            tipoEntidadRelacionada: 'ORDEN_SERVICIO',
            urlAccion: `/ordenes/${orden.id_orden_servicio}`,
          });
        }
      }

      if (ordenesVencidas.length > 0) {
        this.logger.log(`⚠️ CRON: ${ordenesVencidas.length} órdenes vencidas detectadas`);
      } else {
        this.logger.log('✅ CRON: No hay órdenes vencidas');
      }
    } catch (error) {
      this.logger.error(`❌ CRON Error órdenes vencidas: ${this.getErrorMessage(error)}`);
    }
  }
}
