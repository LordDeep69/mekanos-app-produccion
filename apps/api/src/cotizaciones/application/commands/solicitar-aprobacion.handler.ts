import { PrismaService } from '@mekanos/database';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { SolicitarAprobacionCommand } from './solicitar-aprobacion.command';

/**
 * SOLICITAR APROBACION HANDLER
 *
 * Flujo:
 * 1. Verificar cotización existe
 * 2. Validar estado BORRADOR (id_estado = 1)
 * 3. Determinar nivel aprobación según total + descuento
 * 4. Crear solicitud aprobaciones_cotizacion
 * 5. Cambiar estado → EN_REVISION (id_estado = 2)
 * 6. TODO: Notificar aprobador (Fase 7 - email/app)
 */
@Injectable()
@CommandHandler(SolicitarAprobacionCommand)
export class SolicitarAprobacionHandler implements ICommandHandler<SolicitarAprobacionCommand> {
  // Umbrales aprobación configurables (TODO Fase 7: mover a tabla config)
  private static readonly UMBRALES = {
    SUPERVISOR_TOTAL: 5000000,      // $5M COP
    GERENTE_TOTAL: 15000000,        // $15M COP
    SUPERVISOR_DESCUENTO: 15.0,     // 15%
    GERENTE_DESCUENTO: 25.0,        // 25%
  };

  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: SolicitarAprobacionCommand): Promise<any> {
    // 1. Verificar cotización existe
    const cotizacion = await this.repository.findById(command.idCotizacion);
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    // 2. Validar estado BORRADOR (id_estado = 1)
    if (cotizacion.id_estado !== 1) {
      throw new BadRequestException(
        `Solo cotizaciones BORRADOR pueden solicitar aprobación. Estado actual: ${cotizacion.id_estado}`
      );
    }

    // 3. Determinar nivel aprobación
    const nivelAprobacion = this.determinarNivelAprobacion(
      cotizacion.total_cotizacion,
      cotizacion.descuento_porcentaje ?? 0,
    );

    // Si no requiere aprobación, cambiar directo a APROBADA_INTERNA
    if (nivelAprobacion.nivel === 'NINGUNO') {
      await this.repository.update(command.idCotizacion, {
        id_estado: 3, // APROBADA_INTERNA
      });

      return {
        message: 'Cotización dentro de umbrales, aprobada automáticamente',
        cotizacion: await this.repository.findById(command.idCotizacion),
        requiere_aprobacion: false,
        razon: nivelAprobacion.razon,
      };
    }

    // 4. Crear solicitud aprobaciones_cotizacion
    const aprobacion = await this.prisma.aprobaciones_cotizacion.create({
      data: {
        id_cotizacion: command.idCotizacion,
        nivel_aprobacion: nivelAprobacion.nivel as any,
        razon_nivel: nivelAprobacion.razon,
        estado_aprobacion: 'PENDIENTE',
        solicitada_por: command.solicitadaPor,
        observaciones_solicitante: command.observacionesSolicitante,
        metadata: {
          total_cotizacion: cotizacion.total_cotizacion,
          descuento_porcentaje: cotizacion.descuento_porcentaje,
          notificacion_enviada: false,
        },
      },
      include: {
        cotizacion: {
          select: {
            numero_cotizacion: true,
            total_cotizacion: true,
          },
        },
      },
    });

    // 5. Cambiar estado → EN_REVISION (id_estado = 2)
    await this.repository.update(command.idCotizacion, {
      id_estado: 2, // EN_REVISION
    });

    // 6. TODO: Notificar aprobador (Fase 7)
    // await this.notificacionesService.notificarAprobador(aprobacion)

    return {
      message: 'Solicitud aprobación creada exitosamente',
      cotizacion: await this.repository.findById(command.idCotizacion),
      aprobacion,
      requiere_aprobacion: true,
    };
  }

  /**
   * Determinar nivel aprobación según reglas negocio
   */
  private determinarNivelAprobacion(
    total: number,
    descuento: number
  ): { nivel: string; razon: string } {
    const { SUPERVISOR_TOTAL, GERENTE_TOTAL, SUPERVISOR_DESCUENTO, GERENTE_DESCUENTO } =
      SolicitarAprobacionHandler.UMBRALES;

    // GERENTE: Total > $15M O Descuento > 25%
    if (total > GERENTE_TOTAL || descuento > GERENTE_DESCUENTO) {
      return {
        nivel: 'GERENTE',
        razon: `Total $${total.toLocaleString()} COP supera umbral GERENTE $${GERENTE_TOTAL.toLocaleString()} COP o descuento ${descuento}% supera límite ${GERENTE_DESCUENTO}%`,
      };
    }

    // SUPERVISOR: Total > $5M O Descuento > 15%
    if (total > SUPERVISOR_TOTAL || descuento > SUPERVISOR_DESCUENTO) {
      return {
        nivel: 'SUPERVISOR',
        razon: `Total $${total.toLocaleString()} COP supera umbral SUPERVISOR $${SUPERVISOR_TOTAL.toLocaleString()} COP o descuento ${descuento}% supera límite ${SUPERVISOR_DESCUENTO}%`,
      };
    }

    // No requiere aprobación
    return {
      nivel: 'NINGUNO',
      razon: `Total $${total.toLocaleString()} COP y descuento ${descuento}% dentro de umbrales automáticos`,
    };
  }
}
