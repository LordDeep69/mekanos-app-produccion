import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from '../infrastructure/prisma-tipos-servicio.repository';
import { CreateTiposServicioCommand } from './create-tipos-servicio.command';

/**
 * Handler: Crear tipo de servicio
 * 
 * Ejecuta la lógica de negocio para crear un nuevo tipo de servicio
 * Delega persistencia al Repository
 */
@CommandHandler(CreateTiposServicioCommand)
export class CreateTiposServicioHandler
  implements ICommandHandler<CreateTiposServicioCommand>
{
  constructor(
    private readonly repository: PrismaTiposServicioRepository,
  ) {}

  async execute(command: CreateTiposServicioCommand) {
    // Transformar Command a estructura de base de datos
    const data = {
      codigo_tipo: command.codigoTipo,
      nombre_tipo: command.nombreTipo,
      descripcion: command.descripcion,
      categoria: command.categoria,
      id_tipo_equipo: command.tipoEquipoId,
      tiene_checklist: command.tieneChecklist,
      tiene_plantilla_informe: command.tienePlantillaInforme,
      requiere_mediciones: command.requiereMediciones,
      duracion_estimada_horas: command.duracionEstimadaHoras,
      orden_visualizacion: command.ordenVisualizacion,
      icono: command.icono,
      color_hex: command.colorHex,
      activo: command.activo,
      observaciones: command.observaciones,
      creado_por: command.userId,
    };

    // Repository valida FKs, normaliza codigo_tipo y persiste
    return this.repository.create(data);
  }
}
