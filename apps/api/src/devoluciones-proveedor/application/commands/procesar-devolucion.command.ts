import { Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { IDevolucionesProveedorRepository } from '../../domain/devoluciones-proveedor.repository';

/**
 * Command: Procesar Devolución (Aprobar o Rechazar)
 * Procesa una devolución solicitada, afectando inventario si se aprueba
 */
export class ProcesarDevolucionCommand implements ICommand {
  constructor(
    public readonly id_devolucion: number,
    public readonly estado_devolucion: 'APROBADA_PROVEEDOR' | 'ACREDITADA',
    public readonly procesada_por: number, // ID usuario
    public readonly observaciones_procesamiento?: string,
  ) {}
}

/**
 * Handler: Procesa el comando ProcesarDevolucionCommand
 * Aprueba/rechaza devolución y actualiza inventario si corresponde
 */
@CommandHandler(ProcesarDevolucionCommand)
export class ProcesarDevolucionHandler implements ICommandHandler<ProcesarDevolucionCommand> {
  constructor(
    @Inject('IDevolucionesProveedorRepository')
    private readonly repository: IDevolucionesProveedorRepository,
  ) {}

  async execute(command: ProcesarDevolucionCommand): Promise<any> {
    try {
      const devolucion = await this.repository.procesar(
        command.id_devolucion,
        command.estado_devolucion,
        command.procesada_por,
        command.observaciones_procesamiento,
      );

      return devolucion;
    } catch (error) {
      throw error;
    }
  }
}
