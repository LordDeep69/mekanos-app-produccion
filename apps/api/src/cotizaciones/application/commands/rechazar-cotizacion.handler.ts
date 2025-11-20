import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RechazarCotizacionCommand } from './rechazar-cotizacion.command';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { PrismaService } from '@mekanos/database';

/**
 * RECHAZAR COTIZACION HANDLER
 *
 * Flujo:
 * 1. Verificar cotización existe
 * 2. Validar estado ENVIADA (id_estado = 4)
 * 3. Validar motivo rechazo existe
 * 4. Cambiar estado a RECHAZADA (id_estado = 6 - ESTADO FINAL)
 * 5. Registrar motivo + observaciones
 */
@Injectable()
@CommandHandler(RechazarCotizacionCommand)
export class RechazarCotizacionHandler implements ICommandHandler<RechazarCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: RechazarCotizacionCommand): Promise<any> {
    // 1. Verificar cotización existe
    const cotizacion = await this.repository.findById(command.idCotizacion);
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    // 2. Validar estado ENVIADA (id_estado = 4)
    if (cotizacion.id_estado !== 4) {
      throw new BadRequestException(
        `Solo cotizaciones ENVIADA pueden rechazarse. Estado actual: ${cotizacion.id_estado}`
      );
    }

    // 3. Validar motivo rechazo existe
    const motivo = await this.prisma.motivos_rechazo.findUnique({
      where: { id_motivo_rechazo: command.idMotivoRechazo },
    });
    if (!motivo) {
      throw new NotFoundException(`Motivo rechazo ${command.idMotivoRechazo} no encontrado`);
    }

    // 4. Cambiar estado a RECHAZADA (id_estado = 6)
    const cotizacionRechazada = await this.repository.update(command.idCotizacion, {
      id_estado: 6, // RECHAZADA (ESTADO FINAL)
      id_motivo_rechazo: command.idMotivoRechazo,
      observaciones_rechazo: command.observacionesRechazo,
    });

    return {
      message: 'Cotización rechazada exitosamente',
      cotizacion: cotizacionRechazada,
      motivo_rechazo: motivo,
    };
  }
}
