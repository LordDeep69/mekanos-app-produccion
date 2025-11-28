import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaTiposServicioRepository } from '../infrastructure/prisma-tipos-servicio.repository';
import { UpdateTiposServicioCommand } from './update-tipos-servicio.command';

/**
 * Handler: Actualizar tipo de servicio
 * 
 * Ejecuta la lógica de negocio para actualizar un tipo de servicio existente
 * Repository valida existencia, FKs y normaliza datos
 */
@CommandHandler(UpdateTiposServicioCommand)
export class UpdateTiposServicioHandler
  implements ICommandHandler<UpdateTiposServicioCommand>
{
  constructor(
    private readonly repository: PrismaTiposServicioRepository,
  ) {}

  async execute(command: UpdateTiposServicioCommand) {
    // Transformar Command a estructura de base de datos
    const dbData: any = {};

    if (command.data.codigoTipo !== undefined) {
      dbData.codigo_tipo = command.data.codigoTipo;
    }
    if (command.data.nombreTipo !== undefined) {
      dbData.nombre_tipo = command.data.nombreTipo;
    }
    if (command.data.descripcion !== undefined) {
      dbData.descripcion = command.data.descripcion;
    }
    if (command.data.categoria !== undefined) {
      dbData.categoria = command.data.categoria;
    }
    if (command.data.tipoEquipoId !== undefined) {
      dbData.id_tipo_equipo = command.data.tipoEquipoId;
    }
    if (command.data.tieneChecklist !== undefined) {
      dbData.tiene_checklist = command.data.tieneChecklist;
    }
    if (command.data.tienePlantillaInforme !== undefined) {
      dbData.tiene_plantilla_informe = command.data.tienePlantillaInforme;
    }
    if (command.data.requiereMediciones !== undefined) {
      dbData.requiere_mediciones = command.data.requiereMediciones;
    }
    if (command.data.duracionEstimadaHoras !== undefined) {
      dbData.duracion_estimada_horas = command.data.duracionEstimadaHoras;
    }
    if (command.data.ordenVisualizacion !== undefined) {
      dbData.orden_visualizacion = command.data.ordenVisualizacion;
    }
    if (command.data.icono !== undefined) {
      dbData.icono = command.data.icono;
    }
    if (command.data.colorHex !== undefined) {
      dbData.color_hex = command.data.colorHex;
    }
    if (command.data.activo !== undefined) {
      dbData.activo = command.data.activo;
    }
    if (command.data.observaciones !== undefined) {
      dbData.observaciones = command.data.observaciones;
    }

    // Agregar campo de auditoría
    dbData.modificado_por = command.userId;

    // Repository valida existencia, FKs, normaliza y persiste
    return this.repository.update(command.id, dbData);
  }
}
