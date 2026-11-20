import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { AprobarCotizacionCommand } from './aprobar-cotizacion.command';

/**
 * APROBAR COTIZACION HANDLER (Cliente)
 *
 * Persiste orden_compra_cliente y observaciones_aprobacion_cliente en columnas dedicadas.
 */
@Injectable()
@CommandHandler(AprobarCotizacionCommand)
export class AprobarCotizacionHandler implements ICommandHandler<AprobarCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
  ) {}

  async execute(command: AprobarCotizacionCommand): Promise<any> {
    const cotizacion = await this.repository.findById(command.idCotizacion);
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    if (cotizacion.id_estado !== 4) {
      throw new BadRequestException(
        `Solo cotizaciones ENVIADA pueden aprobarse por el cliente. Estado actual: ${cotizacion.id_estado}`,
      );
    }

    const cotizacionAprobada = await this.repository.update(command.idCotizacion, {
      id_estado: 5, // APROBADA_CLIENTE
      observaciones_aprobacion_cliente: command.observaciones,
      orden_compra_cliente: command.ordenCompraCliente,
      modificado_por: command.aprobadoPor,
    });

    return {
      message: 'Cotización aprobada por cliente exitosamente',
      cotizacion: cotizacionAprobada,
    };
  }
}
