import { Inject } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { IDevolucionesProveedorRepository } from '../../domain/devoluciones-proveedor.repository';

/**
 * Command: Crear Devolución a Proveedor
 * Crea una solicitud de devolución de componentes al proveedor
 */
export class CrearDevolucionCommand implements ICommand {
  constructor(
    public readonly id_orden_compra: number,
    public readonly id_lote: number,
    public readonly motivo: string, // enum: motivo_devolucion_proveedor_enum
    public readonly cantidad_devuelta: number,
    public readonly solicitada_por: number, // ID usuario
    public readonly observaciones_solicitud?: string,
  ) {}
}

/**
 * Handler: Procesa el comando CrearDevolucionCommand
 * Orquesta la creación de la devolución con validaciones de negocio
 */
@CommandHandler(CrearDevolucionCommand)
export class CrearDevolucionHandler implements ICommandHandler<CrearDevolucionCommand> {
  constructor(
    @Inject('IDevolucionesProveedorRepository')
    private readonly repository: IDevolucionesProveedorRepository,
  ) {}

  async execute(command: CrearDevolucionCommand): Promise<any> {
    try {
      const devolucion = await this.repository.crear({
        id_orden_compra: command.id_orden_compra,
        id_lote: command.id_lote,
        motivo: command.motivo,
        cantidad_devuelta: command.cantidad_devuelta,
        solicitada_por: command.solicitada_por,
        observaciones_solicitud: command.observaciones_solicitud,
      });

      return devolucion;
    } catch (error) {
      // En producción, usar logger adecuado y transformar excepciones
      throw error;
    }
  }
}
