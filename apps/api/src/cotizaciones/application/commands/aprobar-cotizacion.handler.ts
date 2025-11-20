import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AprobarCotizacionCommand } from './aprobar-cotizacion.command';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';

/**
 * APROBAR COTIZACION HANDLER
 *
 * Flujo:
 * 1. Verificar cotización existe
 * 2. Validar estado ENVIADA (id_estado = 4)
 * 3. Cambiar estado a APROBADA_CLIENTE (id_estado = 5 - ESTADO FINAL)
 * 4. Registrar aprobación (fecha + usuario)
 * 5. TODO: Crear orden servicio automáticamente (Fase 7)
 */
@Injectable()
@CommandHandler(AprobarCotizacionCommand)
export class AprobarCotizacionHandler implements ICommandHandler<AprobarCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
  ) {}

  async execute(command: AprobarCotizacionCommand): Promise<any> {
    // 1. Verificar cotización existe
    const cotizacion = await this.repository.findById(command.idCotizacion);
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    // 2. Validar estado ENVIADA (id_estado = 4)
    if (cotizacion.id_estado !== 4) {
      throw new BadRequestException(
        `Solo cotizaciones ENVIADA pueden aprobarse. Estado actual: ${cotizacion.id_estado}`
      );
    }

    // 3. Cambiar estado a APROBADA_CLIENTE (id_estado = 5)
    const cotizacionAprobada = await this.repository.update(command.idCotizacion, {
      id_estado: 5, // APROBADA_CLIENTE (ESTADO FINAL)
      observaciones_rechazo: command.observaciones, // Reutilizar campo para observaciones aprobación
    });

    // 4. TODO: Crear orden servicio automáticamente (Fase 7)
    // await this.ordenesService.crearDesdeC otizacion(command.idCotizacion)

    return {
      message: 'Cotización aprobada por cliente exitosamente',
      cotizacion: cotizacionAprobada,
    };
  }
}
