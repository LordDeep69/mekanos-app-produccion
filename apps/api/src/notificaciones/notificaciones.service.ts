/**
 * NOTIFICACIONES SERVICE - MEKANOS S.A.S
 *
 * Servicio para gestión de notificaciones del sistema.
 * Maneja la creación, lectura y marcado de notificaciones.
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 6 POST-CRUD
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@mekanos/database';

/**
 * Tipos de notificación
 */
export type TipoNotificacion =
  | 'ORDEN_ASIGNADA'
  | 'ORDEN_COMPLETADA'
  | 'ORDEN_VENCIDA'
  | 'COTIZACION_APROBADA'
  | 'COTIZACION_RECHAZADA'
  | 'CONTRATO_POR_VENCER'
  | 'SERVICIO_PROGRAMADO'
  | 'ALERTA_MEDICION'
  | 'RECORDATORIO'
  | 'SISTEMA';

/**
 * Prioridades de notificación
 */
export type PrioridadNotificacion = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

/**
 * Input para crear notificación
 */
export interface CrearNotificacionInput {
  idUsuarioDestino: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  prioridad?: PrioridadNotificacion;
  /** ID de la entidad relacionada (orden, cotización, contrato, etc.) */
  idEntidadRelacionada?: number;
  /** Tipo de entidad relacionada */
  tipoEntidadRelacionada?: string;
  /** URL para navegar al hacer clic */
  urlAccion?: string;
  /** Datos adicionales en JSON */
  datosExtra?: Record<string, any>;
}

/**
 * Filtros para listar notificaciones
 */
export interface FiltrosNotificacion {
  idUsuario: number;
  soloNoLeidas?: boolean;
  tipo?: TipoNotificacion;
  prioridad?: PrioridadNotificacion;
  limite?: number;
  offset?: number;
}

/**
 * Resultado de operación
 */
export interface NotificacionResult {
  success: boolean;
  idNotificacion?: number;
  mensaje?: string;
  error?: string;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una nueva notificación
   */
  async crear(input: CrearNotificacionInput): Promise<NotificacionResult> {
    try {
      // Verificar usuario existe
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: input.idUsuarioDestino },
      });

      if (!usuario) {
        throw new NotFoundException(`Usuario ${input.idUsuarioDestino} no encontrado`);
      }

      const notificacion = await this.prisma.notificaciones.create({
        data: {
          id_usuario: input.idUsuarioDestino,
          tipo_notificacion: input.tipo,
          titulo: input.titulo,
          mensaje: input.mensaje,
          prioridad: input.prioridad || 'NORMAL',
          leida: false,
          fecha_creacion: new Date(),
          id_entidad_relacionada: input.idEntidadRelacionada,
          tipo_entidad_relacionada: input.tipoEntidadRelacionada,
          url_accion: input.urlAccion,
          datos_extra: input.datosExtra ? JSON.stringify(input.datosExtra) : null,
        },
      });

      this.logger.log(`📬 Notificación creada para usuario ${input.idUsuarioDestino}: ${input.titulo}`);

      return {
        success: true,
        idNotificacion: notificacion.id_notificacion,
        mensaje: 'Notificación creada exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error creando notificación: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crea notificaciones para múltiples usuarios
   */
  async crearParaMultiplesUsuarios(
    idUsuarios: number[],
    input: Omit<CrearNotificacionInput, 'idUsuarioDestino'>,
  ): Promise<NotificacionResult> {
    try {
      const notificaciones = idUsuarios.map((idUsuario) => ({
        id_usuario: idUsuario,
        tipo_notificacion: input.tipo,
        titulo: input.titulo,
        mensaje: input.mensaje,
        prioridad: input.prioridad || 'NORMAL',
        leida: false,
        fecha_creacion: new Date(),
        id_entidad_relacionada: input.idEntidadRelacionada,
        tipo_entidad_relacionada: input.tipoEntidadRelacionada,
        url_accion: input.urlAccion,
        datos_extra: input.datosExtra ? JSON.stringify(input.datosExtra) : null,
      }));

      await this.prisma.notificaciones.createMany({
        data: notificaciones,
      });

      this.logger.log(`📬 ${idUsuarios.length} notificaciones creadas: ${input.titulo}`);

      return {
        success: true,
        mensaje: `${idUsuarios.length} notificaciones creadas`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene notificaciones de un usuario
   */
  async listar(filtros: FiltrosNotificacion): Promise<any[]> {
    const where: any = {
      id_usuario: filtros.idUsuario,
    };

    if (filtros.soloNoLeidas) {
      where.leida = false;
    }

    if (filtros.tipo) {
      where.tipo_notificacion = filtros.tipo;
    }

    if (filtros.prioridad) {
      where.prioridad = filtros.prioridad;
    }

    return this.prisma.notificaciones.findMany({
      where,
      orderBy: { fecha_creacion: 'desc' },
      take: filtros.limite || 50,
      skip: filtros.offset || 0,
    });
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async contarNoLeidas(idUsuario: number): Promise<number> {
    return this.prisma.notificaciones.count({
      where: {
        id_usuario: idUsuario,
        leida: false,
      },
    });
  }

  /**
   * Marca una notificación como leída
   */
  async marcarLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionResult> {
    try {
      const notificacion = await this.prisma.notificaciones.findFirst({
        where: {
          id_notificacion: idNotificacion,
          id_usuario: idUsuario,
        },
      });

      if (!notificacion) {
        throw new NotFoundException(`Notificación ${idNotificacion} no encontrada`);
      }

      await this.prisma.notificaciones.update({
        where: { id_notificacion: idNotificacion },
        data: {
          leida: true,
          fecha_lectura: new Date(),
        },
      });

      return { success: true, mensaje: 'Notificación marcada como leída' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async marcarTodasLeidas(idUsuario: number): Promise<NotificacionResult> {
    try {
      const result = await this.prisma.notificaciones.updateMany({
        where: {
          id_usuario: idUsuario,
          leida: false,
        },
        data: {
          leida: true,
          fecha_lectura: new Date(),
        },
      });

      return {
        success: true,
        mensaje: `${result.count} notificaciones marcadas como leídas`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Elimina una notificación
   */
  async eliminar(idNotificacion: number, idUsuario: number): Promise<NotificacionResult> {
    try {
      const notificacion = await this.prisma.notificaciones.findFirst({
        where: {
          id_notificacion: idNotificacion,
          id_usuario: idUsuario,
        },
      });

      if (!notificacion) {
        throw new NotFoundException(`Notificación ${idNotificacion} no encontrada`);
      }

      await this.prisma.notificaciones.delete({
        where: { id_notificacion: idNotificacion },
      });

      return { success: true, mensaje: 'Notificación eliminada' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpia notificaciones antiguas (más de X días)
   */
  async limpiarAntiguas(diasAntiguedad: number = 90): Promise<NotificacionResult> {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

      const result = await this.prisma.notificaciones.deleteMany({
        where: {
          fecha_creacion: { lt: fechaLimite },
          leida: true,
        },
      });

      this.logger.log(`🗑️ ${result.count} notificaciones antiguas eliminadas`);

      return {
        success: true,
        mensaje: `${result.count} notificaciones eliminadas`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== MÉTODOS DE CREACIÓN POR EVENTO ====================

  /**
   * Notifica asignación de orden a técnico
   */
  async notificarOrdenAsignada(
    idTecnico: number,
    numeroOrden: string,
    idOrden: number,
  ): Promise<void> {
    await this.crear({
      idUsuarioDestino: idTecnico,
      tipo: 'ORDEN_ASIGNADA',
      titulo: 'Nueva orden asignada',
      mensaje: `Se te ha asignado la orden de servicio ${numeroOrden}`,
      prioridad: 'ALTA',
      idEntidadRelacionada: idOrden,
      tipoEntidadRelacionada: 'ORDEN_SERVICIO',
      urlAccion: `/ordenes/${idOrden}`,
    });
  }

  /**
   * Notifica orden completada al supervisor
   */
  async notificarOrdenCompletada(
    idSupervisor: number,
    numeroOrden: string,
    idOrden: number,
  ): Promise<void> {
    await this.crear({
      idUsuarioDestino: idSupervisor,
      tipo: 'ORDEN_COMPLETADA',
      titulo: 'Orden completada',
      mensaje: `La orden ${numeroOrden} ha sido completada y está pendiente de revisión`,
      prioridad: 'NORMAL',
      idEntidadRelacionada: idOrden,
      tipoEntidadRelacionada: 'ORDEN_SERVICIO',
      urlAccion: `/ordenes/${idOrden}`,
    });
  }

  /**
   * Notifica cotización aprobada por cliente
   */
  async notificarCotizacionAprobada(
    idAsesor: number,
    numeroCotizacion: string,
    idCotizacion: number,
    nombreCliente: string,
  ): Promise<void> {
    await this.crear({
      idUsuarioDestino: idAsesor,
      tipo: 'COTIZACION_APROBADA',
      titulo: 'Cotización aprobada',
      mensaje: `El cliente ${nombreCliente} ha aprobado la cotización ${numeroCotizacion}`,
      prioridad: 'ALTA',
      idEntidadRelacionada: idCotizacion,
      tipoEntidadRelacionada: 'COTIZACION',
      urlAccion: `/cotizaciones/${idCotizacion}`,
    });
  }

  /**
   * Notifica contrato próximo a vencer
   */
  async notificarContratoPorVencer(
    idAsesor: number,
    codigoContrato: string,
    idContrato: number,
    nombreCliente: string,
    diasRestantes: number,
  ): Promise<void> {
    await this.crear({
      idUsuarioDestino: idAsesor,
      tipo: 'CONTRATO_POR_VENCER',
      titulo: 'Contrato próximo a vencer',
      mensaje: `El contrato ${codigoContrato} de ${nombreCliente} vence en ${diasRestantes} días`,
      prioridad: diasRestantes <= 7 ? 'URGENTE' : 'ALTA',
      idEntidadRelacionada: idContrato,
      tipoEntidadRelacionada: 'CONTRATO',
      urlAccion: `/contratos/${idContrato}`,
    });
  }

  /**
   * Notifica servicio programado para mañana
   */
  async notificarServicioProgramado(
    idTecnico: number,
    descripcion: string,
    idCronograma: number,
    fechaProgramada: Date,
  ): Promise<void> {
    const fechaFormateada = fechaProgramada.toLocaleDateString('es-CO');
    await this.crear({
      idUsuarioDestino: idTecnico,
      tipo: 'SERVICIO_PROGRAMADO',
      titulo: 'Servicio programado',
      mensaje: `Tienes un servicio programado para ${fechaFormateada}: ${descripcion}`,
      prioridad: 'ALTA',
      idEntidadRelacionada: idCronograma,
      tipoEntidadRelacionada: 'CRONOGRAMA',
      urlAccion: `/cronogramas/${idCronograma}`,
    });
  }

  /**
   * Notifica alerta de medición crítica
   */
  async notificarAlertaMedicion(
    idSupervisor: number,
    numeroOrden: string,
    parametro: string,
    valor: number,
    unidad: string,
    idOrden: number,
  ): Promise<void> {
    await this.crear({
      idUsuarioDestino: idSupervisor,
      tipo: 'ALERTA_MEDICION',
      titulo: 'Medición crítica detectada',
      mensaje: `Orden ${numeroOrden}: ${parametro} = ${valor} ${unidad} (CRÍTICO)`,
      prioridad: 'URGENTE',
      idEntidadRelacionada: idOrden,
      tipoEntidadRelacionada: 'ORDEN_SERVICIO',
      urlAccion: `/ordenes/${idOrden}/mediciones`,
    });
  }
}

